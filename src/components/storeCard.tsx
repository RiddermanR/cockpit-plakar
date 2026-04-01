import {
    Card,
    CardTitle,
    CardBody,
    Spinner,
    Alert,
    Title,
    Button,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { useListBackups } from "../hooks/useListBackups";

export const StoreCard = ({ storeName }: { storeName: string }) => {
    const { backups, loading, error } = useListBackups(storeName);

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
                                <Th>Source</Th>
                                <Th />
                            </Tr>
                        </Thead>
                        <Tbody>
                            {backups.map((backup, i) => (
                                <Tr key={i}>
                                    <Td>{backup.datetime}</Td>
                                    <Td>{backup.backupId}</Td>
                                    <Td>{backup.source}</Td>
                                    <Td>
                                        <Button variant="danger" size="sm">Restore</Button>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </CardBody>
        </Card>
    );
};
