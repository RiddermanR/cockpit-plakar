import {
    PageSection,
    Title,
    Alert,
    Stack,
    StackItem,
    Spinner,
    Accordion,
    AccordionItem,
    AccordionToggle,
    AccordionContent,
    Button,
    Flex,
    FlexItem,
} from "@patternfly/react-core";
import { SyncAltIcon } from "@patternfly/react-icons";
import { useUser } from "../hooks/useUser";
import { useStores } from "../hooks/useStores";
import { StoreCard } from "./storeCard";
import { useState } from "react";


export const Snapshots = () => {
    const { debugUser, userError } = useUser();
    const { storeNames, loading, storeError } = useStores();
    const [expanded, setExpanded] = useState('');
    const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});

    const refresh = (name: string) => {
        setRefreshKeys((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }));
    };

    if (userError) {
        return <Alert variant="danger" title="User error">{userError}</Alert>;
    }

    if (storeError) {
        return <Alert variant="danger" title="Store error">{storeError}</Alert>;
    }

    const onToggle = (id: string) => {
        if (id === expanded) {
            setExpanded('');
        } else {
            setExpanded(id);
        }
    };

    return (
        <>
            <PageSection>
                <Title headingLevel="h1" size="2xl">
                    Snapshots
                </Title>
                {debugUser && <p>Running as: <strong>{debugUser}</strong></p>}
            </PageSection>
            <PageSection>
                {loading ? (
                    <Spinner />
                ) : (
                    <Accordion>
                        {storeNames.map((name) => {
                            const toggleId = `toggle-${name}`;
                            const contentId = `content-${name}`;

                            return (
                                <AccordionItem isExpanded={expanded === toggleId} key={name}>
                                    <>
                                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                                            <FlexItem grow={{ default: "grow" }}>
                                                <AccordionToggle
                                                    onClick={() => onToggle(toggleId)}
                                                    id={toggleId}
                                                >
                                                    {name}
                                                </AccordionToggle>
                                            </FlexItem>
                                            <FlexItem>
                                                <Button
                                                    variant="plain"
                                                    aria-label={`Refresh ${name}`}
                                                    onClick={(e) => { e.stopPropagation(); refresh(name); }}
                                                >
                                                    <SyncAltIcon />
                                                </Button>
                                            </FlexItem>
                                        </Flex>
                                        <AccordionContent id={contentId}>
                                            <StoreCard storeName={name} key={name} refreshKey={refreshKeys[name] ?? 0} />
                                        </AccordionContent>
                                    </>
                                </AccordionItem>
                            );
                        })}
                    </Accordion >
                )}
            </PageSection >
        </>
    );
};
