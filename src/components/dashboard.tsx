import {
    PageSection,
    Title,
    Alert,
    Stack,
    StackItem,
    Spinner,
} from "@patternfly/react-core";
import { useUser } from "../hooks/useUser";
import { useStores } from "../hooks/useStores";
import { StoreCard } from "./storeCard";


export const Dashboard = () => {
    const { debugUser, userError } = useUser();
    const { storeNames, loading, storeError } = useStores();

    if (userError) {
        return <Alert variant="danger" title="User error">{userError}</Alert>;
    }

    if (storeError) {
        return <Alert variant="danger" title="Store error">{storeError}</Alert>;
    }

    return (
        <>
            <PageSection>
                <Title headingLevel="h1" size="2xl">
                    Dashboard
                </Title>
                {debugUser && <p>Running as: <strong>{debugUser}</strong></p>}
            </PageSection>
            <PageSection>
                {loading ? (
                    <Spinner />
                ) : (
                    <Stack hasGutter>
                        {storeNames.map((name) => (
                            <StackItem key={name}>
                                <StoreCard key={name} storeName={name} />
                            </StackItem>
                        ))}
                    </Stack>
                )}
            </PageSection>
        </>
    );
};
