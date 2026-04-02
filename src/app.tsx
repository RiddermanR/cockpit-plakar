import React, { useState } from "react";
import { Page, PageSection, Tabs, Tab, TabTitleText } from "@patternfly/react-core";
import { Dashboard } from "./components/dashboard";
import { Snapshots } from "./components/snapshots";

export const Application = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <Page sidebar={null}>
            <PageSection>
                <Tabs
                    activeKey={activeTab}
                    onSelect={(_event, tabIndex) => setActiveTab(tabIndex as number)}
                >
                    <Tab eventKey={0} title={<TabTitleText>Dashboard</TabTitleText>}>
                        <Dashboard />
                    </Tab>
                    <Tab eventKey={1} title={<TabTitleText>Snapshots</TabTitleText>}>
                        <Snapshots />
                    </Tab>
                    <Tab eventKey={2} title={<TabTitleText>Schedule</TabTitleText>}>
                        <PageSection>Schedule</PageSection>
                    </Tab>
                    <Tab eventKey={3} title={<TabTitleText>Stores</TabTitleText>}>
                        <PageSection>Stores</PageSection>
                    </Tab>
                    <Tab eventKey={4} title={<TabTitleText>Sources</TabTitleText>}>
                        <PageSection>Sources</PageSection>
                    </Tab>
                </Tabs>
            </PageSection>
        </Page>
    );
};
