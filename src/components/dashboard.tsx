import { useMemo } from "react";
import {
    PageSection,
    Title,
    Alert,
    Spinner,
    Card,
    CardTitle,
    CardBody,
    CardHeader,
    Gallery,
    Grid,
    GridItem,
    Label,
    EmptyState,
    EmptyStateBody,
    Flex,
    FlexItem,
    Stack,
    StackItem,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { useUser } from "../hooks/useUser";
import { useStores } from "../hooks/useStores";
import { useStoresConfig } from "../hooks/useStoresConfig";
import { useAllStoresBackups, StoreBackups } from "../hooks/useAllStoresBackups";
import { Backup } from "../hooks/useListBackups";
import { useScheduleStatus } from "../hooks/useScheduleStatus";

const SIZE_UNITS: Record<string, number> = {
    B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15,
    KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4, PIB: 1024 ** 5,
};

const parseSize = (s?: string): number => {
    if (!s) return 0;
    const m = s.trim().match(/^([\d.,]+)\s*([A-Za-z]+)?$/);
    if (!m) return 0;
    const num = parseFloat(m[1].replace(",", "."));
    if (isNaN(num)) return 0;
    const unit = (m[2] ?? "B").toUpperCase();
    return num * (SIZE_UNITS[unit] ?? 1);
};

const formatBytes = (bytes: number): string => {
    if (bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
    return `${(bytes / 1000 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const parseDateFromBackup = (b: Backup): Date | null => {
    const m = b.datetime.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
};

const relativeTime = (d: Date | null): string => {
    if (!d) return "—";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo ago`;
    return `${Math.floor(months / 12)} y ago`;
};

interface AggregatedStore {
    name: string;
    type: "s3" | "local" | "unknown";
    location?: string;
    backups: Backup[];
    snapshotCount: number;
    totalSize: number;
    latestDate: Date | null;
    error?: string;
}

const KpiCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <Card isCompact>
        <CardBody>
            <Stack>
                <StackItem><div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{label}</div></StackItem>
                <StackItem><div style={{ fontSize: "1.75rem", fontWeight: 600 }}>{value}</div></StackItem>
                {sub && <StackItem><div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{sub}</div></StackItem>}
            </Stack>
        </CardBody>
    </Card>
);

const BarRow = ({ label, value, max, valueLabel }: { label: string; value: number; max: number; valueLabel: string }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ marginBottom: "0.5rem" }}>
            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
                <FlexItem><span style={{ fontSize: "0.85rem" }}>{label}</span></FlexItem>
                <FlexItem><span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{valueLabel}</span></FlexItem>
            </Flex>
            <div style={{ background: "#e6e6e6", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#06c" }} />
            </div>
        </div>
    );
};

export const Dashboard = () => {
    const { debugUser, userError } = useUser();
    const { storeNames, loading: storesLoading, storeError } = useStores();
    const { stores: storeConfigs } = useStoresConfig();
    const { data, loading: backupsLoading } = useAllStoresBackups(storeNames);
    const { data: scheduleStatus } = useScheduleStatus();

    const aggregated: AggregatedStore[] = useMemo(() => {
        return data.map((sb: StoreBackups): AggregatedStore => {
            const cfg = storeConfigs.find((c) => c.name === sb.storeName);
            const loc = cfg?.location ?? "";
            const type: AggregatedStore["type"] = loc.startsWith("s3://") ? "s3" : loc ? "local" : "unknown";
            const totalSize = sb.backups.reduce((acc, b) => acc + parseSize(b.size), 0);
            const dates = sb.backups.map(parseDateFromBackup).filter((d): d is Date => d !== null);
            const latest = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
            return {
                name: sb.storeName,
                type,
                location: loc,
                backups: sb.backups,
                snapshotCount: sb.backups.length,
                totalSize,
                latestDate: latest,
                error: sb.error,
            };
        });
    }, [data, storeConfigs]);

    const totals = useMemo(() => {
        const totalSnapshots = aggregated.reduce((a, s) => a + s.snapshotCount, 0);
        const totalSize = aggregated.reduce((a, s) => a + s.totalSize, 0);
        const allDates = aggregated.map((s) => s.latestDate).filter((d): d is Date => d !== null);
        const latestOverall = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null;
        const errored = aggregated.filter((s) => s.error).length;
        return { totalSnapshots, totalSize, latestOverall, errored };
    }, [aggregated]);

    const recentSnapshots = useMemo(() => {
        const all: { store: string; backup: Backup; date: Date | null }[] = [];
        for (const s of aggregated) {
            for (const b of s.backups) {
                all.push({ store: s.name, backup: b, date: parseDateFromBackup(b) });
            }
        }
        all.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
        return all.slice(0, 8);
    }, [aggregated]);

    const maxSnapshots = Math.max(1, ...aggregated.map((s) => s.snapshotCount));
    const maxSize = Math.max(1, ...aggregated.map((s) => s.totalSize));

    if (userError) return <Alert variant="danger" title="User error">{userError}</Alert>;
    if (storeError) return <Alert variant="danger" title="Store error">{storeError}</Alert>;

    const loading = storesLoading || backupsLoading;

    return (
        <>
            <PageSection>
                <Title headingLevel="h1" size="2xl">Dashboard</Title>
                {debugUser && <p>Running as: <strong>{debugUser}</strong></p>}
            </PageSection>

            <PageSection>
                {loading ? (
                    <Spinner />
                ) : (
                    <Stack hasGutter>
                        <StackItem>
                            <Grid hasGutter>
                                <GridItem span={6} md={3}><KpiCard label="Stores" value={String(aggregated.length)} sub={`${totals.errored} with errors`} /></GridItem>
                                <GridItem span={6} md={3}><KpiCard label="Snapshots" value={String(totals.totalSnapshots)} /></GridItem>
                                <GridItem span={6} md={3}><KpiCard label="Total size" value={formatBytes(totals.totalSize)} /></GridItem>
                                <GridItem span={6} md={3}><KpiCard label="Last backup" value={relativeTime(totals.latestOverall)} sub={totals.latestOverall?.toLocaleString() ?? ""} /></GridItem>
                            </Grid>
                        </StackItem>

                        <StackItem>
                            <Grid hasGutter>
                                <GridItem span={12} md={6}>
                                    <Card isCompact>
                                        <CardTitle>Snapshots per store</CardTitle>
                                        <CardBody>
                                            {aggregated.length === 0 ? (
                                                <EmptyState><EmptyStateBody>No stores</EmptyStateBody></EmptyState>
                                            ) : aggregated.map((s) => (
                                                <BarRow key={s.name} label={s.name} value={s.snapshotCount} max={maxSnapshots} valueLabel={String(s.snapshotCount)} />
                                            ))}
                                        </CardBody>
                                    </Card>
                                </GridItem>
                                <GridItem span={12} md={6}>
                                    <Card isCompact>
                                        <CardTitle>Size per store</CardTitle>
                                        <CardBody>
                                            {aggregated.length === 0 ? (
                                                <EmptyState><EmptyStateBody>No stores</EmptyStateBody></EmptyState>
                                            ) : aggregated.map((s) => (
                                                <BarRow key={s.name} label={s.name} value={s.totalSize} max={maxSize} valueLabel={formatBytes(s.totalSize)} />
                                            ))}
                                        </CardBody>
                                    </Card>
                                </GridItem>
                            </Grid>
                        </StackItem>

                        <StackItem>
                            <Title headingLevel="h2" size="lg">Stores</Title>
                            <Gallery hasGutter minWidths={{ default: "260px" }}>
                                {aggregated.map((s) => (
                                    <Card key={s.name} isCompact>
                                        <CardHeader>
                                            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }} style={{ width: "100%" }}>
                                                <FlexItem><strong>{s.name}</strong></FlexItem>
                                                <FlexItem>
                                                    <Label color={s.type === "s3" ? "blue" : s.type === "local" ? "green" : "grey"} isCompact>
                                                        {s.type === "unknown" ? "?" : s.type.toUpperCase()}
                                                    </Label>
                                                </FlexItem>
                                            </Flex>
                                        </CardHeader>
                                        <CardBody>
                                            {s.error ? (
                                                <Alert variant="danger" title="Error" isInline isPlain>{s.error}</Alert>
                                            ) : (
                                                <Stack>
                                                    <StackItem><small style={{ opacity: 0.7 }}>{s.location}</small></StackItem>
                                                    <StackItem>Snapshots: <strong>{s.snapshotCount}</strong></StackItem>
                                                    <StackItem>Size: <strong>{formatBytes(s.totalSize)}</strong></StackItem>
                                                    <StackItem>Last: <strong>{relativeTime(s.latestDate)}</strong></StackItem>
                                                </Stack>
                                            )}
                                        </CardBody>
                                    </Card>
                                ))}
                            </Gallery>
                        </StackItem>

                        <StackItem>
                            <Card isCompact>
                                <CardTitle>Scheduled backups</CardTitle>
                                <CardBody>
                                    {scheduleStatus.length === 0 ? (
                                        <EmptyState><EmptyStateBody>No schedules configured</EmptyStateBody></EmptyState>
                                    ) : (
                                        <Table variant="compact">
                                            <Thead>
                                                <Tr>
                                                    <Th>Name</Th>
                                                    <Th>Next</Th>
                                                    <Th>Last</Th>
                                                    <Th>State</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {scheduleStatus.map((s) => (
                                                    <Tr key={s.name}>
                                                        <Td>{s.name}</Td>
                                                        <Td>{s.next || "—"}</Td>
                                                        <Td>{s.last || "—"}</Td>
                                                        <Td>
                                                            <Label color={s.result === "success" ? "green" : s.result ? "red" : "grey"} isCompact>
                                                                {s.result || "unknown"}
                                                            </Label>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </StackItem>

                        <StackItem>
                            <Card isCompact>
                                <CardTitle>Recent snapshots</CardTitle>
                                <CardBody>
                                    {recentSnapshots.length === 0 ? (
                                        <EmptyState><EmptyStateBody>No snapshots yet</EmptyStateBody></EmptyState>
                                    ) : (
                                        <Table variant="compact">
                                            <Thead>
                                                <Tr>
                                                    <Th>When</Th>
                                                    <Th>Store</Th>
                                                    <Th>Backup ID</Th>
                                                    <Th>Source</Th>
                                                    <Th>Size</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {recentSnapshots.map((r, i) => (
                                                    <Tr key={i}>
                                                        <Td>{relativeTime(r.date)}</Td>
                                                        <Td>{r.store}</Td>
                                                        <Td>{r.backup.backupId}</Td>
                                                        <Td>{r.backup.source}</Td>
                                                        <Td>{r.backup.size}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </StackItem>
                    </Stack>
                )}
            </PageSection>
        </>
    );
};
