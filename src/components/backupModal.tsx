import { useEffect, useRef, useState } from "react";
import {
    Modal,
    ModalVariant,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Alert,
} from "@patternfly/react-core";

interface BackupModalProps {
    isOpen: boolean;
    name: string;
    onClose: () => void;
}

export const BackupModal = ({ isOpen, name, onClose }: BackupModalProps) => {
    const [output, setOutput] = useState("");
    const [startError, setStartError] = useState<string | null>(null);
    const outputRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setOutput("");
        setStartError(null);

        const unit = `plakar-${name.toLowerCase()}.service`;

        // Start the service (fire-and-forget). It keeps running independently.
        cockpit
            .spawn(["systemctl", "start", unit], { err: "message", superuser: "require" })
            .catch((err) => setStartError(String(err)));

        // Follow the journal for live output. Cancel when the modal closes.
        const proc = cockpit.spawn(
            ["journalctl", "-fu", unit, "--since", "now", "-o", "cat"],
            { err: "out", superuser: "try" },
        );
        proc.stream((data) => {
            setOutput((prev) => prev + data);
            if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
        });

        return () => {
            proc.close("cancelled");
        };
    }, [isOpen, name]);

    return (
        <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="backup" />
            <ModalBody>
                {startError && <Alert variant="danger" title="Failed to start" isInline>{startError}</Alert>}
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
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" onClick={onClose}>Close</Button>
            </ModalFooter>
        </Modal>
    );
};
