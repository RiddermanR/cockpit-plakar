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
} from "@patternfly/react-core";
import { useUser } from "../hooks/useUser";
import { useStores } from "../hooks/useStores";
import { StoreCard } from "./storeCard";
import { useState } from "react";


export const Restore = () => {
    const { debugUser, userError } = useUser();
    const { storeNames, loading, storeError } = useStores();
    const [expanded, setExpanded] = useState('');

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
                    Restore
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
                                        <AccordionToggle
                                            onClick={() => onToggle(toggleId)}
                                            id={toggleId}
                                        >
                                            {name}
                                        </AccordionToggle>
                                        <AccordionContent id={contentId}>
                                            <StoreCard storeName={name} key={name} />
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
