import { useState, useEffect, useRef } from "react";
import {
    Modal,
    ModalVariant,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardBody,
    Spinner,
} from "@patternfly/react-core";

interface CheckModalProps {
    isOpen: boolean;
    storeName: string;
    backupId: string;
    onClose: () => void;
}

export const CheckModal = ({ isOpen, storeName, backupId, onClose }: CheckModalProps) => {
    const [output, setOutput] = useState("");
    const [running, setRunning] = useState(true);
    const outputRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        setOutput("");
        setRunning(true);

        cockpit
            .spawn(
                ["plakar", "at", `@${storeName}`, "check", backupId],
                { err: "out" }
            )
            .stream((data) => {
                setOutput((prev) => prev + data);
                if (outputRef.current) {
                    outputRef.current.scrollTop = outputRef.current.scrollHeight;
                }
            })
            .then(() => setRunning(false))
            .catch((err) => {
                setOutput((prev) => prev + "\n" + String(err));
                setRunning(false);
            });
    }, [isOpen, storeName, backupId]);

    return (
        <Modal
            variant={ModalVariant.medium}
            isOpen={isOpen}
            onClose={onClose}
        >
            <ModalHeader title={`Check backup ${backupId}`} />
            <ModalBody>
                <Card>
                    <CardBody>
                        {running && !output && (
                            <Spinner size="md" />
                        )}
                        <pre
                            ref={outputRef}
                            style={{
                                maxHeight: "400px",
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
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" onClick={onClose}>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
};
