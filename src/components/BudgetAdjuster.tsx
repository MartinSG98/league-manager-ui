import { Button, Group, Modal, Paper, SimpleGrid, Slider, Stack, Text } from "@mantine/core";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useState } from "react";

import { money } from "../lib/format";
import { useCareer } from "../state/career";

/**
 * Move money between the salary budget and the bank, the way Football Manager trades wage budget
 * for transfer budget. A thousand of the budget is worth a thousand for every week left until the
 * board sets the next one, so the slider shows both sides as they would end up.
 */
export function BudgetAdjuster({ size = "xs", variant = "light" }: { size?: string; variant?: string }) {
  const { career } = useCareer();
  const [open, setOpen] = useState(false);
  if (!career.budget_adjust) return null;
  return (
    <>
      <Button size={size} variant={variant} leftSection={<IconArrowsExchange size={14} />} onClick={() => setOpen(true)}>
        Adjust budgets
      </Button>
      {open && <BudgetModal onClose={() => setOpen(false)} />}
    </>
  );
}

function BudgetModal({ onClose }: { onClose: () => void }) {
  const { career, act, busy } = useCareer();
  const adjust = career.budget_adjust!;
  const [budget, setBudget] = useState(career.budget);
  const bank = career.cash + Math.round((career.budget - budget) * adjust.rate);
  const marks = [adjust.set, career.budget]
    .filter((v, i, all) => v > adjust.low && v < adjust.high && all.indexOf(v) === i)
    .map((value) => ({ value }));

  async function apply() {
    if (await act({ type: "adjust_budget", budget })) onClose();
  }

  return (
    <Modal
      opened
      onClose={onClose}
      centered
      size="lg"
      title={
        <Group gap="sm">
          <IconArrowsExchange size={20} color="var(--gold-bright)" />
          <Text fw={800}>Adjust budgets</Text>
        </Group>
      }
    >
      <Stack gap="lg">
        <SimpleGrid cols={2} spacing="md">
          <Side label="Salary budget" value={budget} change={budget - career.budget} note={`Payroll ${money(career.payroll)}`} />
          <Side label="Bank (transfer funds)" value={bank} change={bank - career.cash} note="Pays transfer fees" />
        </SimpleGrid>
        <Stack gap={6}>
          <Slider
            min={adjust.low}
            max={adjust.high}
            step={adjust.step}
            value={budget}
            onChange={setBudget}
            marks={marks}
            label={(v) => money(v)}
            color="gold"
          />
          <Group justify="space-between">
            <Text fz="xs" c="dimmed">
              ← more for transfers
            </Text>
            <Text fz="xs" c="dimmed">
              more for salaries →
            </Text>
          </Group>
        </Stack>
        <Text fz="xs" c="dimmed">
          The board pays the budget out week by week and what the payroll leaves of it goes to the bank, until it sets the next budget
          after Worlds. With {adjust.weeks} week{adjust.weeks === 1 ? "" : "s"} to go, every {money(100)} of budget is worth{" "}
          {money(Math.round(100 * adjust.rate))} in the bank. The budget never drops below the contracts you pay, and the board set it at{" "}
          {money(adjust.set)}.
        </Text>
        <Group justify="space-between">
          <Button
            variant="subtle"
            size="xs"
            disabled={busy || adjust.set === budget || adjust.set < adjust.low || adjust.set > adjust.high}
            onClick={() => setBudget(adjust.set)}
          >
            Back to the board's budget
          </Button>
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={busy} disabled={budget === career.budget} onClick={apply}>
              Confirm
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function Side({ label, value, change, note }: { label: string; value: number; change: number; note: string }) {
  return (
    <Paper p="md">
      <Text className="eyebrow">{label}</Text>
      <Group gap="xs" align="baseline">
        <Text fw={800} fz={26}>
          {money(value)}
        </Text>
        {change !== 0 && (
          <Text fz="sm" fw={700} className={change > 0 ? "gain" : "loss"}>
            {change > 0 ? "+" : "−"}
            {money(Math.abs(change))}
          </Text>
        )}
      </Group>
      <Text fz="xs" c="dimmed">
        {note}
      </Text>
    </Paper>
  );
}
