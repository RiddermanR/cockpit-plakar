import { useEffect, useState } from "react";
import {
    TextInput,
    Button,
    Spinner,
    Alert,
    InputGroup,
    InputGroupItem,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { FolderIcon } from "@patternfly/react-icons";

interface FolderPickerProps {
    value: string;
    onChange: (path: string) => void;
    isDisabled?: boolean;
}

export const FolderPicker = ({ value, onChange, isDisabled }: FolderPickerProps) => {
    const [dirs, setDirs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [browsePath, setBrowsePath] = useState(value || "/");

    const loadDirs = (path: string) => {
        setLoading(true);
        setError(null);
        cockpit
            .spawn(["find", path, "-maxdepth", "1", "-mindepth", "1", "-type", "d", "-not", "-name", ".*"], { err: "ignore" })
            .then((output) => {
                const entries = output
                    .trim()
                    .split("\n")
                    .filter((l) => l.length > 0)
                    .map((l) => l.trim())
                    .sort();
                setDirs(entries);
                setLoading(false);
            })
            .catch((err) => {
                setError(String(err));
                setDirs([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (value && browsePath !== value && !dirs.length && !loading) {
            setBrowsePath(value);
        }
    }, [value]);

    useEffect(() => {
        if (!isDisabled && browsePath) {
            loadDirs(browsePath);
        }
    }, [browsePath, isDisabled]);

    const navigateTo = (path: string) => {
        setBrowsePath(path);
        onChange(path);
    };

    const goUp = () => {
        const parent = browsePath.replace(/\/[^/]+\/?$/, "") || "/";
        setBrowsePath(parent);
        onChange(parent);
    };

    const handleInputChange = (_event: unknown, val: string) => {
        onChange(val);
    };

    const handleInputKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            setBrowsePath(value);
        }
    };

    const basename = (path: string) => path.split("/").filter(Boolean).pop() || path;

    return (
        <div>
            <InputGroup>
                <InputGroupItem isFill>
                    <TextInput
                        id="folder-picker-input"
                        value={value}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        isDisabled={isDisabled}
                        placeholder="/path/to/folder"
                    />
                </InputGroupItem>
                <InputGroupItem>
                    <Button
                        variant="control"
                        onClick={() => setBrowsePath(value)}
                        isDisabled={isDisabled}
                    >
                        Go
                    </Button>
                </InputGroupItem>
            </InputGroup>
            <div style={{ maxHeight: "250px", overflowY: "auto", marginTop: "0.5rem", border: "1px solid var(--pf-t--global--border--color--default)", borderRadius: "var(--pf-t--global--border--radius--small)" }}>
                {loading ? (
                    <div style={{ padding: "1rem", textAlign: "center" }}><Spinner size="md" /></div>
                ) : error ? (
                    <Alert variant="warning" title="Cannot read directory" isInline isPlain>{error}</Alert>
                ) : (
                    <Table variant="compact" borders={false}>
                        <Tbody>
                            {browsePath !== "/" && (
                                <Tr
                                    isClickable
                                    onRowClick={goUp}
                                >
                                    <Td><FolderIcon /> ..</Td>
                                </Tr>
                            )}
                            {dirs.map((dir) => (
                                <Tr
                                    key={dir}
                                    isClickable
                                    onRowClick={() => navigateTo(dir)}
                                    isRowSelected={value === dir}
                                >
                                    <Td><FolderIcon /> {basename(dir)}</Td>
                                </Tr>
                            ))}
                            {dirs.length === 0 && (
                                <Tr>
                                    <Td>No subdirectories</Td>
                                </Tr>
                            )}
                        </Tbody>
                    </Table>
                )}
            </div>
        </div>
    );
};
