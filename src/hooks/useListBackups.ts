import { useEffect, useState } from "react";

export interface Backup {
    datetime: string;
    backupId: string;
    size?: string;
    timeConsumed?: string;
    source: string;
}

function parseBackups(output: string): Backup[] {
    const lines = output.trim().split("\n").filter((l) => l.length > 0);
    const backups: Backup[] = [];

    for (const line of lines) {
        // format: datetime  backupid  size  time-consumed  source
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;

        const date = new Date(parts[0]);
        if (isNaN(date.getTime())) continue;

        const dd = String(date.getDate()).padStart(2, "0");
        const MM = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");

        backups.push({
            datetime: `${dd}-${MM}-${yyyy} ${hh}:${mm}`,
            backupId: parts[1],
            size: parts[2] + ' ' + parts[3],
            timeConsumed: parts[4],
            source: parts[5],
        });
    }

    backups.sort((a, b) => b.datetime.localeCompare(a.datetime));
    return backups.slice(0, 15);
}

export const useListBackups = (storeName: string) => {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        cockpit
            .spawn(["plakar", "at", `@${storeName}`, "ls"])
            .then((output) => {
                setBackups(parseBackups(output));
                setLoading(false);
            })
            .catch((err) => {
                setError(String(err));
                setLoading(false);
            });
    }, [storeName]);

    return { backups, loading, error };
};
