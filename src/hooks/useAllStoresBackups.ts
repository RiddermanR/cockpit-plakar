import { useEffect, useState } from "react";
import { Backup, parseBackups } from "./useListBackups";

export interface StoreBackups {
    storeName: string;
    backups: Backup[];
    error?: string;
}

export const useAllStoresBackups = (storeNames: string[]) => {
    const [data, setData] = useState<StoreBackups[]>([]);
    const [loading, setLoading] = useState(true);

    const key = storeNames.join("\u0000");
    useEffect(() => {
        if (storeNames.length === 0) {
            setData([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        Promise.all(
            storeNames.map((name) =>
                cockpit
                    .spawn(["plakar", "at", `@${name}`, "ls"], { err: "message" })
                    .then((out): StoreBackups => ({ storeName: name, backups: parseBackups(out) }))
                    .catch((err): StoreBackups => ({ storeName: name, backups: [], error: String(err) })),
            ),
        ).then((results) => {
            setData(results);
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { data, loading };
};
