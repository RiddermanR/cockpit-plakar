import { useState } from "react";
import {
    Card,
    CardBody,
    Spinner,
    Alert,
    Button,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { useListBackups } from "../hooks/useListBackups";
import { RestoreModal } from "./restoreModal";
import { CheckModal } from "./checkModal";
import { ExploreModal } from "./exploreModal";

export const StoreCard = ({ storeName, refreshKey = 0 }: { storeName: string; refreshKey?: number }) => {
    const { backups, loading, error } = useListBackups(storeName, refreshKey);
    const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
    const [checkBackupId, setCheckBackupId] = useState<string | null>(null);
    const [exploreBackupId, setExploreBackupId] = useState<string | null>(null);

    return (
        <Card>
            <CardBody>
                {loading ? (
                    <Spinner size="md" />
                ) : error ? (
                    <Alert variant="danger" title="Failed to list backups" isInline isPlain>{error}</Alert>
                ) : backups.length === 0 ? (
                    <p>No backups found</p>
                ) : (
                    <Table variant="compact">
                        <Thead>
                            <Tr>
                                <Th>Date/Time</Th>
                                <Th>Backup ID</Th>
                                <Th>Size</Th>
                                <Th>Time Consumed</Th>
                                <Th>Source</Th>
                                <Th />
                            </Tr>
                        </Thead>
                        <Tbody>
                            {backups.map((backup, i) => (
                                <Tr key={i}>
                                    <Td>{backup.datetime}</Td>
                                    <Td>{backup.backupId}</Td>
                                    <Td>{backup.size}</Td>
                                    <Td>{backup.timeConsumed}</Td>
                                    <Td>{backup.source}</Td>
                                    <Td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setCheckBackupId(backup.backupId)}
                                        >
                                            Check
                                        </Button>
                                        {" "}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setExploreBackupId(backup.backupId)}
                                        >
                                            Explore
                                        </Button>
                                        {" "}
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setRestoreBackupId(backup.backupId)}
                                        >
                                            Restore
                                        </Button>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </CardBody>
            {restoreBackupId && (
                <RestoreModal
                    isOpen={true}
                    storeName={storeName}
                    backupId={restoreBackupId}
                    onClose={() => setRestoreBackupId(null)}
                />
            )}
            {checkBackupId && (
                <CheckModal
                    isOpen={true}
                    storeName={storeName}
                    backupId={checkBackupId}
                    onClose={() => setCheckBackupId(null)}
                />
            )}
            {exploreBackupId && (
                <ExploreModal
                    isOpen={true}
                    storeName={storeName}
                    backupId={exploreBackupId}
                    onClose={() => setExploreBackupId(null)}
                />
            )}
        </Card>
    );
};
