import { useState } from "react";
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
    EmptyState,
    EmptyStateBody,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { FolderPicker } from "./folderPicker";
import { SourceConfig, useSourcesConfig } from "../hooks/useSourcesConfig";

export const SourcesTab = () => {
    const { sources, loading, error, save } = useSourcesConfig();
    const [editing, setEditing] = useState<{ original: SourceConfig | null; draft: SourceConfig } | null>(null);
    const [deleting, setDeleting] = useState<SourceConfig | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const openAdd = () => {
        setSaveError(null);
        setEditing({ original: null, draft: { name: "", location: "", excludes: [] } });
    };

    const openEdit = (s: SourceConfig) => {
        setSaveError(null);
        setEditing({ original: s, draft: { ...s } });
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
        const isDup = sources.some((s) => s.name === draft.name && s !== editing.original);
        if (isDup) {
            setSaveError(`A source named "${draft.name}" already exists`);
            return;
        }

        const isNew = !editing.original;
        const original = editing.original;
        const locationChanged = !isNew && original && original.location !== draft.location;
        const draftExcludes = (draft.excludes ?? []).join(",");
        const originalExcludes = (original?.excludes ?? []).join(",");
        const excludesChanged = !isNew && draftExcludes !== originalExcludes;

        let next: SourceConfig[];
        if (original) {
            next = sources.map((s) => (s === original ? draft : s));
        } else {
            next = [...sources, draft];
        }

        save(next)
            .then(async () => {
                if (isNew) {
                    await cockpit.spawn(
                        ["plakar", "source", "add", draft.name, draft.location],
                        { err: "message" },
                    );
                    if (draftExcludes.length > 0) {
                        await cockpit.spawn(
                            ["plakar", "source", "set", draft.name, `excludes=${draftExcludes}`],
                            { err: "message" },
                        );
                    }
                    return;
                }
                if (locationChanged && original) {
                    await cockpit.spawn(
                        ["plakar", "source", "set", original.name, `location=${draft.location}`],
                        { err: "message" },
                    );
                }
                if (excludesChanged && original) {
                    await cockpit.spawn(
                        ["plakar", "source", "set", original.name, `excludes=${draftExcludes}`],
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
        const next = sources.filter((s) => s !== deleting);
        save(next)
            .then(() => cockpit.spawn(["plakar", "source", "rm", name], { err: "message" }))
            .then(() => setDeleting(null))
            .catch((err) => setSaveError(String(err)));
    };

    return (
        <PageSection>
            <Title headingLevel="h1" size="2xl">Sources</Title>

            {error && <Alert variant="danger" title="Failed to load sources" isInline>{error}</Alert>}

            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <Button variant="primary" onClick={openAdd}>Add source</Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            {loading ? (
                <Spinner />
            ) : sources.length === 0 ? (
                <EmptyState>
                    <EmptyStateBody>No sources configured.</EmptyStateBody>
                </EmptyState>
            ) : (
                <Table variant="compact">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Location</Th>
                            <Th />
                        </Tr>
                    </Thead>
                    <Tbody>
                        {sources.map((s) => (
                            <Tr key={s.name}>
                                <Td>{s.name}</Td>
                                <Td>{s.location}</Td>
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
                    <ModalHeader title={editing.original ? `Modify source "${editing.original.name}"` : "Add source"} />
                    <ModalBody>
                        {saveError && <Alert variant="danger" title={saveError} isInline isPlain />}
                        <Form>
                            <FormGroup label="Name" isRequired fieldId="source-name">
                                <TextInput
                                    id="source-name"
                                    value={editing.draft.name}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, name: v } })}
                                    isDisabled={!!editing.original}
                                />
                            </FormGroup>
                            <FormGroup label="Location" isRequired fieldId="source-location">
                                <FolderPicker
                                    value={editing.draft.location}
                                    onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, location: v } })}
                                />
                            </FormGroup>
                            <FormGroup label="Excludes" fieldId="source-excludes">
                                <TextInput
                                    id="source-excludes"
                                    value={(editing.draft.excludes ?? []).join(",")}
                                    onChange={(_e, v) => setEditing({
                                        ...editing,
                                        draft: {
                                            ...editing.draft,
                                            excludes: v.split(",").map((p) => p.trim()).filter((p) => p.length > 0),
                                        },
                                    })}
                                    placeholder="*.tmp,*.log"
                                />
                            </FormGroup>
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
                    <ModalHeader title="Delete source" />
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
