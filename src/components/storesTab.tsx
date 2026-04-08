import { useMemo, useState } from "react";
import {
    PageSection,
    Title,
    Toolbar,
    ToolbarContent,
    ToolbarItem,
    Button,
    Spinner,
    Alert,
    Modal,
    ModalVariant,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    TextInput,
    FormSelect,
    FormSelectOption,
    Checkbox,
    EmptyState,
    EmptyStateBody,
    InputGroup,
    InputGroupItem,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { EyeIcon, EyeSlashIcon } from "@patternfly/react-icons";
import { FolderPicker } from "./folderPicker";

const SecretInput = ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => {
    const [shown, setShown] = useState(false);
    return (
        <InputGroup>
            <InputGroupItem isFill>
                <TextInput
                    id={id}
                    type={shown ? "text" : "password"}
                    value={value}
                    onChange={(_e, v) => onChange(v)}
                />
            </InputGroupItem>
            <InputGroupItem>
                <Button
                    variant="control"
                    aria-label={shown ? "Hide" : "Show"}
                    onClick={() => setShown(!shown)}
                >
                    {shown ? <EyeSlashIcon /> : <EyeIcon />}
                </Button>
            </InputGroupItem>
        </InputGroup>
    );
};
import {
    StoreConfig,
    StoreType,
    detectType,
    useStoresConfig,
} from "../hooks/useStoresConfig";

const emptyForType = (type: StoreType): StoreConfig =>
    type === "s3"
        ? { name: "", location: "s3://", access_key: "", secret_access_key: "", passphrase: "" }
        : { name: "", location: "", passphrase: "" };

export const StoresTab = () => {
    const { stores, loading, error, save } = useStoresConfig();
    const [selectedType, setSelectedType] = useState<StoreType>("s3");
    const [editing, setEditing] = useState<{ original: StoreConfig | null; draft: StoreConfig; type: StoreType } | null>(null);
    const [deleting, setDeleting] = useState<StoreConfig | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [createStore, setCreateStore] = useState(false);

    const filtered = useMemo(
        () => stores.filter((s) => detectType(s.location) === selectedType),
        [stores, selectedType],
    );

    const openAdd = () => {
        setSaveError(null);
        setCreateStore(false);
        setEditing({ original: null, draft: emptyForType(selectedType), type: selectedType });
    };

    const openEdit = (s: StoreConfig) => {
        setSaveError(null);
        setEditing({ original: s, draft: { ...s }, type: detectType(s.location) });
    };

    const closeEdit = () => setEditing(null);

    const submitEdit = () => {
        if (!editing) return;
        const draft = editing.draft;
        if (!draft.name.trim()) {
            setSaveError("Name is required");
            return;
        }
        if (!draft.location.trim()) {
            setSaveError("Location is required");
            return;
        }
        const isDup = stores.some(
            (s) => s.name === draft.name && s !== editing.original,
        );
        if (isDup) {
            setSaveError(`A store named "${draft.name}" already exists`);
            return;
        }

        let next: StoreConfig[];
        if (editing.original) {
            next = stores.map((s) => (s === editing.original ? draft : s));
        } else {
            next = [...stores, draft];
        }
        const isNew = !editing.original;
        const original = editing.original;
        const changedPairs: string[] = [];
        if (!isNew && original) {
            const keys: (keyof StoreConfig)[] = ["name", "location", "access_key", "secret_access_key", "passphrase"];
            for (const k of keys) {
                if ((draft[k] ?? "") !== (original[k] ?? "")) {
                    changedPairs.push(`${k}=${draft[k] ?? ""}`);
                }
            }
        }
        save(next)
            .then(() => {
                if (isNew) {
                    return cockpit.spawn(
                        ["sh", "-c", `plakar store import -config ~/.config/cockpitplakar/stores.yaml "$1"`, "sh", draft.name],
                        { err: "message" },
                    );
                }
            })
            .then(async () => {
                if (original) {
                    for (const pair of changedPairs) {
                        await cockpit.spawn(["plakar", "store", "set", original.name, pair], { err: "message" });
                    }
                }
            })
            .then(() => {
                if (isNew && createStore) {
                    return cockpit.spawn(
                        ["plakar", "at", `@${draft.name}`, "create"],
                        { err: "message" },
                    );
                }
            })
            .then(() => setEditing(null))
            .catch((err) => setSaveError(String(err)));
    };

    const confirmDelete = () => {
        if (!deleting) return;
        const name = deleting.name;
        const next = stores.filter((s) => s !== deleting);
        save(next)
            .then(() => cockpit.spawn(["plakar", "store", "rm", name], { err: "message" }))
            .then(() => setDeleting(null))
            .catch((err) => setSaveError(String(err)));
    };

    const draftType: StoreType = editing ? editing.type : selectedType;

    return (
        <PageSection>
            <Title headingLevel="h1" size="2xl">Stores</Title>

            {error && <Alert variant="danger" title="Failed to load stores" isInline>{error}</Alert>}

            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <FormSelect
                            value={selectedType}
                            onChange={(_e, v) => setSelectedType(v as StoreType)}
                            aria-label="Store type"
                        >
                            <FormSelectOption value="s3" label="S3" />
                            <FormSelectOption value="local" label="Local" />
                        </FormSelect>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="primary" onClick={openAdd}>Add store</Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            {loading ? (
                <Spinner />
            ) : filtered.length === 0 ? (
                <EmptyState>
                    <EmptyStateBody>No {selectedType === "s3" ? "S3" : "local"} stores configured.</EmptyStateBody>
                </EmptyState>
            ) : (
                <Table variant="compact">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Location</Th>
                            {selectedType === "s3" && <Th>Access Key</Th>}
                            <Th />
                        </Tr>
                    </Thead>
                    <Tbody>
                        {filtered.map((s) => (
                            <Tr key={s.name}>
                                <Td>{s.name}</Td>
                                <Td>{s.location}</Td>
                                {selectedType === "s3" && <Td>{s.access_key ?? ""}</Td>}
                                <Td>
                                    <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>Modify</Button>
                                    {" "}
                                    <Button variant="danger" size="sm" onClick={() => setDeleting(s)}>Delete</Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            )}

            {editing && (
                <Modal variant={ModalVariant.small} isOpen onClose={closeEdit}>
                    <ModalHeader title={editing.original ? `Modify store "${editing.original.name}"` : "Add store"} />
                    <ModalBody>
                        {saveError && <Alert variant="danger" title={saveError} isInline isPlain />}
                        <Form>
                            <FormGroup label="Name" isRequired fieldId="store-name">
                                <TextInput
                                    id="store-name"
                                    value={editing.draft.name}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, name: v } })}
                                />
                            </FormGroup>
                            <FormGroup label="Location" isRequired fieldId="store-location">
                                {draftType === "local" ? (
                                    <FolderPicker
                                        value={editing.draft.location}
                                        onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, location: v } })}
                                    />
                                ) : (
                                    <TextInput
                                        id="store-location"
                                        value={editing.draft.location}
                                        onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, location: v } })}
                                        placeholder="s3://bucket"
                                    />
                                )}
                            </FormGroup>
                            {draftType === "s3" && (
                                <>
                                    <FormGroup label="Access key" fieldId="store-access-key">
                                        <TextInput
                                            id="store-access-key"
                                            value={editing.draft.access_key ?? ""}
                                            onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, access_key: v } })}
                                        />
                                    </FormGroup>
                                    <FormGroup label="Secret access key" fieldId="store-secret-key">
                                        <SecretInput
                                            id="store-secret-key"
                                            value={editing.draft.secret_access_key ?? ""}
                                            onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, secret_access_key: v } })}
                                        />
                                    </FormGroup>
                                </>
                            )}
                            <FormGroup label="Passphrase" fieldId="store-passphrase">
                                <SecretInput
                                    id="store-passphrase"
                                    value={editing.draft.passphrase ?? ""}
                                    onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, passphrase: v } })}
                                />
                            </FormGroup>
                            {!editing.original && (
                                <FormGroup fieldId="store-create">
                                    <Checkbox
                                        id="store-create"
                                        label="Create store"
                                        isChecked={createStore}
                                        onChange={(_e, v) => setCreateStore(v)}
                                    />
                                </FormGroup>
                            )}
                        </Form>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="primary" onClick={submitEdit}>Save</Button>
                        <Button variant="link" onClick={closeEdit}>Cancel</Button>
                    </ModalFooter>
                </Modal>
            )}

            {deleting && (
                <Modal variant={ModalVariant.small} isOpen onClose={() => setDeleting(null)}>
                    <ModalHeader title="Delete store" />
                    <ModalBody>
                        Are you sure you want to delete <strong>{deleting.name}</strong>?
                        {saveError && <Alert variant="danger" title={saveError} isInline isPlain />}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                        <Button variant="link" onClick={() => setDeleting(null)}>Cancel</Button>
                    </ModalFooter>
                </Modal>
            )}
        </PageSection>
    );
};
