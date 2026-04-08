import { useEffect, useState } from "react";
import {
    FormSelect,
    FormSelectOption,
    TextInput,
    Stack,
    StackItem,
    HelperText,
    HelperTextItem,
} from "@patternfly/react-core";

interface Preset {
    label: string;
    value: string;
}

const PRESETS: Preset[] = [
    { label: "Hourly", value: "hourly" },
    { label: "Daily at 02:00", value: "*-*-* 02:00:00" },
    { label: "Daily at 23:40", value: "*-*-* 23:40:00" },
    { label: "Weekly (Sun 03:00)", value: "Sun *-*-* 03:00:00" },
    { label: "Weekly (Mon 03:00)", value: "Mon *-*-* 03:00:00" },
    { label: "Weekdays at 19:00", value: "Mon..Fri *-*-* 19:00:00" },
    { label: "Monthly (1st 04:00)", value: "*-*-01 04:00:00" },
];

const CUSTOM = "__custom__";

interface CalendarInputProps {
    value: string;
    onChange: (v: string) => void;
}

export const CalendarInput = ({ value, onChange }: CalendarInputProps) => {
    const matchedPreset = PRESETS.find((p) => p.value === value)?.value ?? CUSTOM;
    const [valid, setValid] = useState<boolean | null>(null);
    const [nextRuns, setNextRuns] = useState<string[]>([]);
    const [errorMsg, setErrorMsg] = useState<string>("");

    useEffect(() => {
        if (!value.trim()) {
            setValid(null);
            setNextRuns([]);
            setErrorMsg("");
            return;
        }
        let cancelled = false;
        const handle = setTimeout(() => {
            cockpit
                .spawn(
                    ["systemd-analyze", "calendar", "--iterations=3", value],
                    { err: "out" },
                )
                .then((output) => {
                    if (cancelled) return;
                    const lines = output.split("\n");
                    const nexts = lines
                        .filter((l) => /Next elapse:/.test(l) || /Iter\. #/.test(l))
                        .map((l) => l.replace(/^.*?:\s*/, "").trim())
                        .filter((l) => l.length > 0);
                    setValid(true);
                    setErrorMsg("");
                    setNextRuns(nexts);
                })
                .catch((err) => {
                    if (cancelled) return;
                    setValid(false);
                    setNextRuns([]);
                    setErrorMsg(String(err).trim().split("\n").pop() ?? "Invalid expression");
                });
        }, 300);
        return () => { cancelled = true; clearTimeout(handle); };
    }, [value]);

    return (
        <Stack hasGutter>
            <StackItem>
                <FormSelect
                    value={matchedPreset}
                    onChange={(_e, v) => { if (v !== CUSTOM) onChange(v); }}
                    aria-label="Schedule preset"
                >
                    {PRESETS.map((p) => (
                        <FormSelectOption key={p.value} value={p.value} label={p.label} />
                    ))}
                    <FormSelectOption value={CUSTOM} label="Custom…" />
                </FormSelect>
            </StackItem>
            <StackItem>
                <TextInput
                    value={value}
                    onChange={(_e, v) => onChange(v)}
                    placeholder="*-*-* 23:40:00"
                    validated={valid === false ? "error" : valid === true ? "success" : "default"}
                />
            </StackItem>
            <StackItem>
                <HelperText>
                    {valid === false && <HelperTextItem variant="error">{errorMsg || "Invalid OnCalendar expression"}</HelperTextItem>}
                    {valid === true && nextRuns.length > 0 && (
                        <HelperTextItem variant="success">
                            Next: {nextRuns.slice(0, 3).join(" · ")}
                        </HelperTextItem>
                    )}
                </HelperText>
            </StackItem>
        </Stack>
    );
};
