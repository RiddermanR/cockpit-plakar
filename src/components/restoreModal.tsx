import { useState, useRef } from "react";
import {
    Modal,
    ModalVariant,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardBody,
    FormGroup,
    Form,
} from "@patternfly/react-core";
import { FolderPicker } from "./folderPicker";

interface RestoreModalProps {
    isOpen: boolean;
    storeName: string;
    backupId: string;
    onClose: () => void;
}

export const RestoreModal = ({ isOpen, storeName, backupId, onClose }: RestoreModalProps) => {
    const [destination, setDestination] = useState("/tmp/restore");
    const [output, setOutput] = useState("");
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const outputRef = useRef<HTMLPreElement>(null);

    const scrollToBottom = () => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    };

    const handleRestore = () => {
        setRunning(true);
        setOutput("");
        setFinished(false);

        cockpit
            .spawn(
                ["plakar", "at", `@${storeName}`, "restore", "-to", destination, backupId],
                { err: "out" }
            )
            .stream((data) => {
                setOutput((prev) => prev + data);
                scrollToBottom();
            })
            .then(() => {
                setRunning(false);
                setFinished(true);
            })
            .catch((err) => {
                setOutput((prev) => prev + "\n" + String(err));
                setRunning(false);
                setFinished(true);
            });
    };

    const handleClose = () => {
        setOutput("");
        setRunning(false);
        setFinished(false);
        setDestination("/tmp/restore");
        onClose();
    };

    return (
        <Modal
            variant={ModalVariant.medium}
            isOpen={isOpen}
            onClose={running ? undefined : handleClose}
        >
            <ModalHeader title={`Restore backup ${backupId}`} />
            <ModalBody>
                <Form>
                    <FormGroup label="Destination folder" fieldId="restore-destination">
                        <FolderPicker
                            value={destination}
                            onChange={setDestination}
                            isDisabled={running || finished}
                        />
                    </FormGroup>
                </Form>
                {output && (
                    <Card style={{ marginTop: "1rem" }}>
                        <CardBody>
                            <pre
                                ref={outputRef}
                                style={{
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    margin: 0,
                                    fontSize: "0.85rem",
                                }}
                            >
                                {output}
                            </pre>
                        </CardBody>
                    </Card>
                )}
            </ModalBody>
            <ModalFooter>
                {finished ? (
                    <Button variant="primary" onClick={handleClose}>
                        Close
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="primary"
                            onClick={handleRestore}
                            isDisabled={running || !destination.trim()}
                            isLoading={running}
                        >
                            Restore
                        </Button>
                        <Button
                            variant="link"
                            onClick={handleClose}
                            isDisabled={running}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </ModalFooter>
        </Modal>
    );
};
