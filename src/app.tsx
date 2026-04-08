import React, { useState } from "react";
import { Page, PageSection, Tabs, Tab, TabTitleText } from "@patternfly/react-core";
import { Dashboard } from "./components/dashboard";
import { Snapshots } from "./components/snapshots";
import { StoresTab } from "./components/storesTab";
import { SourcesTab } from "./components/sourcesTab";
import { ScheduleTab } from "./components/scheduleTab";

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
                        <ScheduleTab />
                    </Tab>
                    <Tab eventKey={3} title={<TabTitleText>Stores</TabTitleText>}>
                        <StoresTab />
                    </Tab>
                    <Tab eventKey={4} title={<TabTitleText>Sources</TabTitleText>}>
                        <SourcesTab />
                    </Tab>
                </Tabs>
            </PageSection>
        </Page>
    );
};
