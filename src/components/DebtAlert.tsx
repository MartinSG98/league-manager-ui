import { Alert, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { longDate, money } from "../lib/format";
import { useCareer } from "../state/career";

/** What being in debt costs, while the bank is below zero. */
export function DebtAlert({ mb }: { mb?: string }) {
  const { career } = useCareer();
  const adjust = career.budget_adjust;
  if (career.cash >= 0 || !adjust) return null;
  const debt = -career.cash;
  const deep = debt > adjust.cut_at;
  return (
    <Alert color="red" variant="light" mb={mb} icon={<IconAlertTriangle size={16} />} title={`The club is ${money(debt)} in debt`}>
      <Text fz="sm">
        Until the bank is back above zero the board pays for no transfers and loses {deep ? "two points" : "a point"} of
        confidence every week.{" "}
        {deep
          ? `The debt is past ${money(adjust.cut_at)}, a quarter of the salary budget, so the board cuts every wage by 10% at most every eight weeks${
              adjust.wage_cut ? ` (last on ${longDate(adjust.wage_cut)})` : ""
            }, and the squad takes it badly.`
          : `Past ${money(adjust.cut_at)}, a quarter of the salary budget, the board starts cutting wages, and the squad will take it badly.`}{" "}
        Cutting the salary budget puts money in the bank at once.
      </Text>
    </Alert>
  );
}
