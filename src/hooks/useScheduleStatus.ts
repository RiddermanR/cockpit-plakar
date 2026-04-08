import { useEffect, useState } from "react";

export interface ScheduleStatus {
    name: string;
    next: string;
    last: string;
    result: string;
}

const SCRIPT = `
for t in /etc/systemd/system/plakar-*.timer; do
    [ -e "$t" ] || continue
    base=$(basename "$t" .timer)
    name=\${base#plakar-}
    next=$(systemctl show "$base.timer" -p NextElapseUSecRealtime --value 2>/dev/null)
    last=$(systemctl show "$base.timer" -p LastTriggerUSec --value 2>/dev/null)
    result=$(systemctl show "$base.service" -p Result --value 2>/dev/null)
    echo "$name|$next|$last|$result"
done
`;

export const useScheduleStatus = () => {
    const [data, setData] = useState<ScheduleStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cockpit
            .spawn(["sh", "-c", SCRIPT], { err: "message", superuser: "try" })
            .then((output) => {
                const rows = output
                    .split("\n")
                    .filter((l) => l.trim().length > 0)
                    .map((l): ScheduleStatus => {
                        const [name, next, last, result] = l.split("|");
                        return { name, next: next ?? "", last: last ?? "", result: result ?? "" };
                    });
                setData(rows);
                setLoading(false);
            })
            .catch(() => {
                setData([]);
                setLoading(false);
            });
    }, []);

    return { data, loading };
};
