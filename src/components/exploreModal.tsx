import { useState, useEffect, useMemo } from "react";
import {
    Modal,
    ModalVariant,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
    Alert,
    Breadcrumb,
    BreadcrumbItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { FolderIcon, FileIcon } from "@patternfly/react-icons";
import { RestoreFileModal } from "./restoreFileModal";

interface ExploreModalProps {
    isOpen: boolean;
    storeName: string;
    backupId: string;
    onClose: () => void;
}

interface Entry {
    name: string;
    path: string;
    parent: string;
    isDir: boolean;
    size: string;
    mtime: string;
}

const formatMtime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const parentOf = (p: string) => {
    const idx = p.lastIndexOf("/");
    if (idx <= 0) return "";
    return p.slice(0, idx);
};

const parseLine = (line: string): Entry | null => {
    // 2023-07-30T10:48:36Z -rw-r--r--   roelof    users   62 KiB /data/.../file
    const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!m) return null;
    const [, mtime, mode, , , sizeNum, sizeUnit, rawPath] = m;
    const path = rawPath.replace(/\/+$/, "");
    if (!path) return null;
    const name = path.slice(path.lastIndexOf("/") + 1);
    return {
        name,
        path,
        parent: parentOf(path),
        isDir: mode.startsWith("d"),
        size: mode.startsWith("d") ? "" : `${sizeNum} ${sizeUnit}`,
        mtime,
    };
};

export const ExploreModal = ({ isOpen, storeName, backupId, onClose }: ExploreModalProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [currentPath, setCurrentPath] = useState("");
    const [restoreFile, setRestoreFile] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        setError(null);
        setEntries([]);
        setCurrentPath("");

        cockpit
            .spawn(
                ["plakar", "at", `@${storeName}`, "ls", "-recursive", backupId],
                { err: "out" }
            )
            .then((output: string) => {
                const parsed: Entry[] = [];
                for (const line of output.split("\n")) {
                    const e = parseLine(line);
                    if (e) parsed.push(e);
                }
                setEntries(parsed);
                setLoading(false);
            })
            .catch((err) => {
                setError(String(err));
                setLoading(false);
            });
    }, [isOpen, storeName, backupId]);

    const childrenByParent = useMemo(() => {
        const byPath = new Map<string, Entry>();
        for (const e of entries) byPath.set(e.path, e);

        // Synthesize missing ancestor directories so the tree is reachable from "".
        for (const e of entries) {
            let p = e.parent;
            while (p !== "" && !byPath.has(p)) {
                const name = p.slice(p.lastIndexOf("/") + 1);
                byPath.set(p, {
                    name,
                    path: p,
                    parent: parentOf(p),
                    isDir: true,
                    size: "",
                    mtime: "",
                });
                p = parentOf(p);
            }
        }

        const map = new Map<string, Entry[]>();
        for (const e of byPath.values()) {
            const arr = map.get(e.parent) ?? [];
            arr.push(e);
            map.set(e.parent, arr);
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => {
                if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        }
        return map;
    }, [entries]);

    const rootPath = useMemo(() => {
        let r = "";
        // Walk down while there is exactly one child and it's a directory.
        while (true) {
            const kids = childrenByParent.get(r) ?? [];
            if (kids.length === 1 && kids[0].isDir) {
                r = kids[0].path;
                continue;
            }
            return r;
        }
    }, [childrenByParent]);

    useEffect(() => {
        setCurrentPath(rootPath);
    }, [rootPath]);

    const visible = childrenByParent.get(currentPath) ?? [];
    const relativePath = currentPath.startsWith(rootPath)
        ? currentPath.slice(rootPath.length)
        : currentPath;
    const pathParts = relativePath.split("/").filter(Boolean);

    const goUp = () => {
        if (currentPath === rootPath) return;
        setCurrentPath(parentOf(currentPath));
    };

    return (
        <Modal
            variant={ModalVariant.large}
            isOpen={isOpen}
            onClose={onClose}
        >
            <ModalHeader title={`Explore backup ${backupId}`} />
            <ModalBody>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                        <Spinner size="lg" />
                        <p style={{ marginTop: "1rem" }}>Listing snapshot…</p>
                    </div>
                ) : error ? (
                    <Alert variant="danger" title="Failed to list snapshot" isInline>{error}</Alert>
                ) : (
                    <>
                        <Breadcrumb style={{ marginBottom: "1rem" }}>
                            <BreadcrumbItem
                                isActive={pathParts.length === 0}
                                onClick={() => setCurrentPath(rootPath)}
                                component="button"
                            >
                                /
                            </BreadcrumbItem>
                            {pathParts.map((part, i) => {
                                const fullPath = rootPath + "/" + pathParts.slice(0, i + 1).join("/");
                                const isLast = i === pathParts.length - 1;
                                return (
                                    <BreadcrumbItem
                                        key={fullPath}
                                        isActive={isLast}
                                        onClick={isLast ? undefined : () => setCurrentPath(fullPath)}
                                        component={isLast ? undefined : "button"}
                                    >
                                        {part}
                                    </BreadcrumbItem>
                                );
                            })}
                        </Breadcrumb>

                        <div style={{
                            maxHeight: "450px",
                            overflowY: "auto",
                            border: "1px solid var(--pf-t--global--border--color--default)",
                            borderRadius: "var(--pf-t--global--border--radius--small)",
                        }}>
                            <Table variant="compact" borders={false}>
                                <Thead>
                                    <Tr>
                                        <Th>Name</Th>
                                        <Th>Size</Th>
                                        <Th>Modified</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {currentPath !== rootPath && (
                                        <Tr isClickable onRowClick={goUp}>
                                            <Td><FolderIcon /> ..</Td>
                                            <Td></Td>
                                            <Td></Td>
                                        </Tr>
                                    )}
                                    {visible.map((entry) => (
                                        <Tr
                                            key={entry.path}
                                            isClickable
                                            onRowClick={entry.isDir
                                                ? () => setCurrentPath(entry.path)
                                                : () => setRestoreFile(entry.path)}
                                        >
                                            <Td>
                                                {entry.isDir ? <FolderIcon /> : <FileIcon />}{" "}
                                                {entry.name}
                                            </Td>
                                            <Td>{entry.size}</Td>
                                            <Td>{formatMtime(entry.mtime)}</Td>
                                        </Tr>
                                    ))}
                                    {visible.length === 0 && currentPath === rootPath && (
                                        <Tr>
                                            <Td>Empty snapshot</Td>
                                            <Td></Td>
                                            <Td></Td>
                                        </Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </div>
                    </>
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" onClick={onClose}>
                    Close
                </Button>
            </ModalFooter>
            {restoreFile && (
                <RestoreFileModal
                    isOpen={restoreFile !== null}
                    storeName={storeName}
                    backupId={backupId}
                    filePath={restoreFile}
                    onClose={() => setRestoreFile(null)}
                />
            )}
        </Modal>
    );
};
