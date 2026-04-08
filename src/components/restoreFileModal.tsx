import { useState, useRef, useEffect } from "react";
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

interface RestoreFileModalProps {
    isOpen: boolean;
    storeName: string;
    backupId: string;
    filePath: string;
    onClose: () => void;
}

export const RestoreFileModal = ({ isOpen, storeName, backupId, filePath, onClose }: RestoreFileModalProps) => {
    const [destination, setDestination] = useState("");
    const [homeDir, setHomeDir] = useState("");
    const [output, setOutput] = useState("");
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const outputRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        cockpit.spawn(["sh", "-c", "echo $HOME"]).then((out) => {
            const home = out.trim();
            setHomeDir(home);
            setDestination(home);
        });
    }, []);

    const scrollToBottom = () => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    };

    const handleRestore = () => {
        setRunning(true);
        setOutput("");
        setFinished(false);

        const sq = (s: string) => "'" + s.replace(/'/g, "'\\''") + "'";
        const store = sq(`@${storeName}`);
        const target = sq(`${backupId}:${filePath}`);
        const dest = sq(destination);
        const fp = sq(filePath);

        // plakar restore mirrors the source path under -to, so restore into a
        // temp dir and move just the file (or directory) out into the chosen
        // destination, then clean the temp dir up.
        const script =
            'set -e; ' +
            'tmp=$(mktemp -d); ' +
            'trap "rm -rf \\"$tmp\\"" EXIT; ' +
            `plakar at ${store} restore -to "$tmp" ${target}; ` +
            `mv "$tmp"${fp} ${dest}/`;

        cockpit
            .spawn(
                ["sh", "-c", script],
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
        setDestination(homeDir);
        onClose();
    };

    return (
        <Modal
            variant={ModalVariant.medium}
            isOpen={isOpen}
            onClose={running ? undefined : handleClose}
        >
            <ModalHeader title={`Restore file ${filePath}`} />
            <ModalBody>
                <Form>
                    <FormGroup label="Destination folder" fieldId="restore-file-destination">
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
