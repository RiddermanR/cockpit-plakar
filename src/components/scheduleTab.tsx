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
    FormSelect,
    FormSelectOption,
    EmptyState,
    EmptyStateBody,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { Schedule, useSchedules } from "../hooks/useSchedules";
import { BackupModal } from "./backupModal";
import { CalendarInput } from "./calendarInput";
import { useStores } from "../hooks/useStores";
import { useSourcesConfig } from "../hooks/useSourcesConfig";
import { useUser } from "../hooks/useUser";

const ignorePathFor = (source: string) => `~/.config/cockpitplakar/${source}-ignore.txt`;

const empty = (): Schedule => ({
    name: "",
    description: "",
    onCalendar: "*-*-* 23:40:00",
    user: "",
    store: "",
    source: "",
    ignoreFile: "",
    enabled: false,
});

export const ScheduleTab = () => {
    const { schedules, loading, error, save, remove, setEnabled } = useSchedules();
    const { storeNames } = useStores();
    const { sources } = useSourcesConfig();
    const { debugUser } = useUser();

    const [editing, setEditing] = useState<{ original: Schedule | null; draft: Schedule } | null>(null);
    const [deleting, setDeleting] = useState<Schedule | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [running, setRunning] = useState<string | null>(null);

    const openAdd = () => {
        setSaveError(null);
        setEditing({ original: null, draft: { ...empty(), user: debugUser } });
    };
    const openEdit = (s: Schedule) => {
        setSaveError(null);
        setEditing({ original: s, draft: { ...s } });
    };
    const closeEdit = () => setEditing(null);

    const submit = () => {
        if (!editing) return;
        const d = editing.draft;
        if (!d.name.trim()) { setSaveError("Name is required"); return; }
        if (!d.onCalendar.trim()) { setSaveError("OnCalendar is required"); return; }
        if (!d.user.trim()) { setSaveError("User is required"); return; }
        if (!d.store.trim()) { setSaveError("Store is required"); return; }
        if (!d.source.trim()) { setSaveError("Source is required"); return; }
        const isDup = schedules.some((s) => s.name === d.name && s !== editing.original);
        if (isDup) { setSaveError(`A schedule named "${d.name}" already exists`); return; }

        const draft: Schedule = { ...d, ignoreFile: d.ignoreFile?.trim() || undefined };
        setBusy(true);
        save(draft, editing.original?.name)
            .then(() => { setEditing(null); setBusy(false); })
            .catch((err) => { setSaveError(String(err)); setBusy(false); });
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        remove(deleting.name)
            .then(() => { setDeleting(null); setBusy(false); })
            .catch((err) => { setSaveError(String(err)); setBusy(false); });
    };

    return (
        <PageSection>
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem>
                        <Title headingLevel="h1" size="2xl">Schedule</Title>
                    </ToolbarItem>
                    <ToolbarItem align={{ default: "alignEnd" }}>
                        <Button variant="primary" onClick={openAdd}>Add schedule</Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            {error && <Alert variant="danger" title="Failed to load schedules" isInline>{error}</Alert>}

            {loading ? (
                <Spinner />
            ) : schedules.length === 0 ? (
                <EmptyState><EmptyStateBody>No schedules configured.</EmptyStateBody></EmptyState>
            ) : (
                <Table variant="compact">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Description</Th>
                            <Th>OnCalendar</Th>
                            <Th>User</Th>
                            <Th>Store</Th>
                            <Th>Source</Th>
                            <Th>Status</Th>
                            <Th />
                        </Tr>
                    </Thead>
                    <Tbody>
                        {schedules.map((s) => (
                            <Tr key={s.name}>
                                <Td>{s.name}</Td>
                                <Td>{s.description}</Td>
                                <Td>{s.onCalendar}</Td>
                                <Td>{s.user}</Td>
                                <Td>{s.store}</Td>
                                <Td>{s.source}</Td>
                                <Td>{s.enabled ? "Enabled" : "Disabled"}</Td>
                                <Td>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        isDisabled={busy}
                                        onClick={() => {
                                            setBusy(true);
                                            setEnabled(s.name, !s.enabled)
                                                .then(() => setBusy(false))
                                                .catch((err) => { setSaveError(String(err)); setBusy(false); });
                                        }}
                                    >
                                        {s.enabled ? "Disable" : "Enable"}
                                    </Button>
                                    {" "}
                                    <Button variant="secondary" size="sm" onClick={() => setRunning(s.name)}>Start now</Button>
                                    {" "}
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
                <Modal variant={ModalVariant.medium} isOpen onClose={closeEdit}>
                    <ModalHeader title={editing.original ? `Modify schedule "${editing.original.name}"` : "Add schedule"} />
                    <ModalBody>
                        {saveError && <Alert variant="danger" title={saveError} isInline isPlain />}
                        <Form>
                            <FormGroup label="Name" isRequired fieldId="sched-name">
                                <TextInput
                                    id="sched-name"
                                    value={editing.draft.name}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, name: v } })}
                                />
                            </FormGroup>
                            <FormGroup label="Description" fieldId="sched-desc">
                                <TextInput
                                    id="sched-desc"
                                    value={editing.draft.description}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, description: v } })}
                                />
                            </FormGroup>
                            <FormGroup label="OnCalendar" isRequired fieldId="sched-cal">
                                <CalendarInput
                                    value={editing.draft.onCalendar}
                                    onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, onCalendar: v } })}
                                />
                            </FormGroup>
                            <FormGroup label="User" isRequired fieldId="sched-user">
                                <TextInput
                                    id="sched-user"
                                    value={editing.draft.user}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, user: v } })}
                                />
                            </FormGroup>
                            <FormGroup label="Store" isRequired fieldId="sched-store">
                                <FormSelect
                                    id="sched-store"
                                    value={editing.draft.store}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, store: v } })}
                                >
                                    <FormSelectOption value="" label="-- select --" isPlaceholder />
                                    {storeNames.map((n) => <FormSelectOption key={n} value={n} label={n} />)}
                                    {editing.draft.store && !storeNames.includes(editing.draft.store) && (
                                        <FormSelectOption value={editing.draft.store} label={editing.draft.store} />
                                    )}
                                </FormSelect>
                            </FormGroup>
                            <FormGroup label="Source" isRequired fieldId="sched-source">
                                <FormSelect
                                    id="sched-source"
                                    value={editing.draft.source}
                                    onChange={(_e, v) => setEditing({
                                        ...editing,
                                        draft: {
                                            ...editing.draft,
                                            source: v,
                                            ignoreFile: v ? ignorePathFor(v) : "",
                                        },
                                    })}
                                >
                                    <FormSelectOption value="" label="-- select --" isPlaceholder />
                                    {sources.map((s) => <FormSelectOption key={s.name} value={s.name} label={s.name} />)}
                                    {editing.draft.source && !sources.some((s) => s.name === editing.draft.source) && (
                                        <FormSelectOption value={editing.draft.source} label={editing.draft.source} />
                                    )}
                                </FormSelect>
                            </FormGroup>
                            <FormGroup label="Ignore file" fieldId="sched-ignore">
                                <TextInput
                                    id="sched-ignore"
                                    value={editing.draft.ignoreFile ?? ""}
                                    onChange={(_e, v) => setEditing({ ...editing, draft: { ...editing.draft, ignoreFile: v } })}
                                    placeholder="/data/plakar/exclude.txt"
                                />
                            </FormGroup>
                        </Form>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="primary" onClick={submit} isDisabled={busy}>Save</Button>
                        <Button variant="link" onClick={closeEdit} isDisabled={busy}>Cancel</Button>
                    </ModalFooter>
                </Modal>
            )}

            {running && (
                <BackupModal isOpen name={running} onClose={() => setRunning(null)} />
            )}

            {deleting && (
                <Modal variant={ModalVariant.small} isOpen onClose={() => setDeleting(null)}>
                    <ModalHeader title="Delete schedule" />
                    <ModalBody>
                        Are you sure you want to delete <strong>{deleting.name}</strong>? The systemd timer will be disabled and the unit files removed.
                        {saveError && <Alert variant="danger" title={saveError} isInline isPlain />}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="danger" onClick={confirmDelete} isDisabled={busy}>Delete</Button>
                        <Button variant="link" onClick={() => setDeleting(null)} isDisabled={busy}>Cancel</Button>
                    </ModalFooter>
                </Modal>
            )}
        </PageSection>
    );
};
