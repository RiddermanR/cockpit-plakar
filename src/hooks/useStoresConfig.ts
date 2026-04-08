import { useCallback, useEffect, useState } from "react";

export type StoreType = "s3" | "local";

export interface StoreConfig {
    name: string;
    location: string;
    access_key?: string;
    secret_access_key?: string;
    passphrase?: string;
}

const CONFIG_PATH = "~/.config/cockpitplakar/stores.yaml";

export function detectType(location: string): StoreType {
    return location.trim().startsWith("s3://") ? "s3" : "local";
}

export function parseStoresYaml(text: string): StoreConfig[] {
    const stores: StoreConfig[] = [];
    let current: StoreConfig | null = null;

    for (const raw of text.split("\n")) {
        const line = raw.replace(/\r$/, "");
        if (!line.trim() || line.trim().startsWith("#")) continue;

        const top = line.match(/^([^\s:#][^:]*):\s*$/);
        if (top) {
            if (current) stores.push(current);
            current = { name: top[1].trim(), location: "" };
            continue;
        }

        const kv = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
        if (kv && current) {
            const key = kv[1];
            const value = kv[2].trim();
            if (key === "location") current.location = value;
            else if (key === "access_key") current.access_key = value;
            else if (key === "secret_access_key") current.secret_access_key = value;
            else if (key === "passphrase") current.passphrase = value;
        }
    }
    if (current) stores.push(current);
    return stores;
}

export function serializeStoresYaml(stores: StoreConfig[]): string {
    const blocks: string[] = [];
    for (const s of stores) {
        const lines = [`${s.name}:`, `  location: ${s.location}`];
        if (detectType(s.location) === "s3") {
            if (s.access_key !== undefined) lines.push(`  access_key: ${s.access_key}`);
            if (s.secret_access_key !== undefined) lines.push(`  secret_access_key: ${s.secret_access_key}`);
        }
        if (s.passphrase !== undefined) lines.push(`  passphrase: ${s.passphrase}`);
        blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n") + "\n";
}

export const useStoresConfig = () => {
    const [stores, setStores] = useState<StoreConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        cockpit
            .spawn(["sh", "-c", `cat ${CONFIG_PATH} 2>/dev/null || true`], { err: "message" })
            .then((output) => {
                setStores(parseStoresYaml(output));
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

    const save = useCallback((next: StoreConfig[]) => {
        const yaml = serializeStoresYaml(next);
        return cockpit
            .spawn(
                ["sh", "-c", `mkdir -p "$(dirname ${CONFIG_PATH})" && cat > ${CONFIG_PATH}`],
                { err: "message" },
            )
            .input(yaml)
            .then(() => {
                setStores(next);
            });
    }, []);

    return { stores, loading, error, reload: load, save };
};
