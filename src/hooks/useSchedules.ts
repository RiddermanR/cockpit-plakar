import { useCallback, useEffect, useState } from "react";

export interface Schedule {
    name: string;
    description: string;
    onCalendar: string;
    user: string;
    store: string;
    source: string;
    ignoreFile?: string;
    enabled: boolean;
}

const SYSTEMD_DIR = "/etc/systemd/system";

const LIST_SCRIPT = `
for t in ${SYSTEMD_DIR}/plakar-*.timer; do
    [ -e "$t" ] || continue
    base=$(basename "$t" .timer)
    name=\${base#plakar-}
    echo "===TIMER:$name==="
    cat "$t" 2>/dev/null
    echo "===SERVICE:$name==="
    cat "${SYSTEMD_DIR}/$base.service" 2>/dev/null
    echo "===ENABLED:$name==="
    systemctl is-enabled "$base.timer" 2>/dev/null || echo "disabled"
    echo "===END:$name==="
done
`;

function getKey(block: string, section: string, key: string): string {
    const lines = block.split("\n");
    let inSection = false;
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("[") && line.endsWith("]")) {
            inSection = line.slice(1, -1) === section;
            continue;
        }
        if (!inSection) continue;
        const idx = line.indexOf("=");
        if (idx < 0) continue;
        if (line.slice(0, idx).trim() === key) return line.slice(idx + 1).trim();
    }
    return "";
}

function parseExecStart(execStart: string): { store: string; source: string; ignoreFile?: string } {
    // /usr/bin/plakar at @store backup [-ignore-file path] @source
    const m = execStart.match(/@(\S+)\s+backup\s+(?:-ignore-file\s+(\S+)\s+)?@(\S+)/);
    if (!m) return { store: "", source: "" };
    return { store: m[1], ignoreFile: m[2], source: m[3] };
}

export function parseSchedules(output: string): Schedule[] {
    const schedules: Schedule[] = [];
    const blocks = output.split(/===END:[^=]+===/);
    for (const block of blocks) {
        const timerM = block.match(/===TIMER:([^=]+)===\n([\s\S]*?)(?=\n===SERVICE:)/);
        const serviceM = block.match(/===SERVICE:[^=]+===\n([\s\S]*?)(?=\n===ENABLED:)/);
        const enabledM = block.match(/===ENABLED:[^=]+===\n([\s\S]*)$/);
        if (!timerM || !serviceM) continue;
        const name = timerM[1].trim();
        const timerContent = timerM[2];
        const serviceContent = serviceM[1];
        const enabled = (enabledM?.[1].trim() ?? "").startsWith("enabled");

        const description = getKey(timerContent, "Unit", "Description") || getKey(serviceContent, "Unit", "Description");
        const onCalendar = getKey(timerContent, "Timer", "OnCalendar");
        const user = getKey(serviceContent, "Service", "User");
        const execStart = getKey(serviceContent, "Service", "ExecStart");
        const parsed = parseExecStart(execStart);

        schedules.push({
            name,
            description,
            onCalendar,
            user,
            store: parsed.store,
            source: parsed.source,
            ignoreFile: parsed.ignoreFile,
            enabled,
        });
    }
    return schedules;
}

export function buildTimer(s: Schedule): string {
    return `[Unit]
Description=${s.description}
[Timer]
OnCalendar=${s.onCalendar}
[Install]
WantedBy=timers.target
`;
}

function expandHome(path: string, user: string): string {
    if (!path.startsWith("~")) return path;
    const home = user === "root" ? "/root" : `/home/${user}`;
    return home + path.slice(1);
}

export function buildService(s: Schedule): string {
    const ignorePath = s.ignoreFile ? expandHome(s.ignoreFile, s.user) : "";
    const ignore = ignorePath ? `-ignore-file ${ignorePath} ` : "";
    return `[Unit]
Description=${s.description}
[Service]
User=${s.user}
ExecStart=/usr/bin/plakar at @${s.store} backup ${ignore}@${s.source}
`;
}

export const useSchedules = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        cockpit
            .spawn(["sh", "-c", LIST_SCRIPT], { err: "message", superuser: "try" })
            .then((output) => {
                setSchedules(parseSchedules(output));
                setLoading(false);
            })
            .catch((err) => {
                setError(String(err));
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const writeFile = (path: string, content: string) =>
        cockpit
            .spawn(["sh", "-c", `cat > "$1"`, "sh", path], { err: "message", superuser: "require" })
            .input(content);

    const save = useCallback(async (schedule: Schedule, originalName?: string) => {
        const unitName = schedule.name.toLowerCase();
        const base = `plakar-${unitName}`;
        const timerPath = `${SYSTEMD_DIR}/${base}.timer`;
        const servicePath = `${SYSTEMD_DIR}/${base}.service`;

        // If renaming, disable+remove the old unit first
        if (originalName && originalName.toLowerCase() !== unitName) {
            const oldBase = `plakar-${originalName.toLowerCase()}`;
            await cockpit.spawn(
                ["systemctl", "disable", "--now", `${oldBase}.timer`],
                { err: "message", superuser: "require" },
            ).catch(() => undefined);
            await cockpit.spawn(
                ["sh", "-c", `rm -f "${SYSTEMD_DIR}/${oldBase}.timer" "${SYSTEMD_DIR}/${oldBase}.service"`],
                { err: "message", superuser: "require" },
            );
        }

        await writeFile(timerPath, buildTimer(schedule));
        await writeFile(servicePath, buildService(schedule));
        await cockpit.spawn(["systemctl", "daemon-reload"], { err: "message", superuser: "require" });
        await cockpit.spawn(
            ["systemctl", "enable", "--now", `${base}.timer`],
            { err: "message", superuser: "require" },
        );
        load();
    }, [load]);

    const remove = useCallback(async (name: string) => {
        const base = `plakar-${name.toLowerCase()}`;
        await cockpit.spawn(
            ["systemctl", "disable", "--now", `${base}.timer`],
            { err: "message", superuser: "require" },
        ).catch(() => undefined);
        await cockpit.spawn(
            ["sh", "-c", `rm -f "${SYSTEMD_DIR}/${base}.timer" "${SYSTEMD_DIR}/${base}.service"`],
            { err: "message", superuser: "require" },
        );
        await cockpit.spawn(["systemctl", "daemon-reload"], { err: "message", superuser: "require" });
        load();
    }, [load]);

    const setEnabled = useCallback(async (name: string, enabled: boolean) => {
        const unit = `plakar-${name.toLowerCase()}.timer`;
        const action = enabled ? "enable" : "disable";
        await cockpit.spawn(
            ["systemctl", action, "--now", unit],
            { err: "message", superuser: "require" },
        );
        load();
    }, [load]);

    return { schedules, loading, error, reload: load, save, remove, setEnabled };
};
