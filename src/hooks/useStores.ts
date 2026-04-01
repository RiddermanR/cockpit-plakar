import { useEffect, useState } from "react";

export const useStores = () => {
    const [storeNames, setStoreNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [storeError, setError] = useState<string | null>(null);

    useEffect(() => {
        cockpit
            .spawn(["plakar", "store", "show"])
            .then((output) => {
                setStoreNames(parseStoreNames(output));
                setLoading(false);
            })
            .catch((err) => {
                setError(String(err));
                setLoading(false);
            });
    }, []);
    return { storeNames, loading, storeError };


};

function parseStoreNames(output: string): string[] {
    const names: string[] = [];
    for (const line of output.split("\n")) {
        const match = line.match(/^(\S+):$/);
        if (match) {
            names.push(match[1]);
        }
    }
    return names;
}
