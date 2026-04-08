import { useCallback, useEffect, useState } from "react";

export interface SourceConfig {
    name: string;
    location: string;
    excludes?: string[];
}

const CONFIG_PATH = "~/.config/cockpitplakar/sources.yaml";

export function parseSourcesYaml(text: string): SourceConfig[] {
    const sources: SourceConfig[] = [];
    let current: SourceConfig | null = null;

    for (const raw of text.split("\n")) {
        const line = raw.replace(/\r$/, "");
        if (!line.trim() || line.trim().startsWith("#")) continue;

        const top = line.match(/^([^\s:#][^:]*):\s*$/);
        if (top) {
            if (current) sources.push(current);
            current = { name: top[1].trim(), location: "" };
            continue;
        }

        const kv = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
        if (kv && current) {
            if (kv[1] === "location") current.location = kv[2].trim();
            else if (kv[1] === "excludes") {
                const v = kv[2].trim().replace(/^'(.*)'$/, "$1");
                current.excludes = v ? v.split(",").map((p) => p.trim()).filter((p) => p.length > 0) : [];
            }
        }
    }
    if (current) sources.push(current);
    return sources;
}

export function serializeSourcesYaml(sources: SourceConfig[]): string {
    return sources.map((s) => {
        const lines = [`${s.name}:`, `    location: ${s.location}`];
        if (s.excludes && s.excludes.length > 0) {
            lines.push(`    excludes: '${s.excludes.join(",")}'`);
        }
        return lines.join("\n");
    }).join("\n") + "\n";
}

export const useSourcesConfig = () => {
    const [sources, setSources] = useState<SourceConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        cockpit
            .spawn(["sh", "-c", `cat ${CONFIG_PATH} 2>/dev/null || true`], { err: "message" })
            .then((output) => {
                setSources(parseSourcesYaml(output));
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

    const save = useCallback((next: SourceConfig[]) => {
        const yaml = serializeSourcesYaml(next);
        return cockpit
            .spawn(
                ["sh", "-c", `mkdir -p "$(dirname ${CONFIG_PATH})" && cat > ${CONFIG_PATH}`],
                { err: "message" },
            )
            .input(yaml)
            .then(() => {
                setSources(next);
            });
    }, []);

    return { sources, loading, error, reload: load, save };
};
