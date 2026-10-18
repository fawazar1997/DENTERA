import type { Dictionary } from "@/lib/dictionaries";
import { WhyChooseUs } from "./WhyChooseUs";
import { StatsStrip } from "./StatsStrip";

/** "Why Dentera" reasons followed by the numbers strip. */
export function WhyDentera({
  dict,
  className,
}: {
  dict: Dictionary;
  className?: string;
}) {
  const stats = [
    { value: dict.stats.yearsValue, label: dict.stats.yearsLabel },
    { value: dict.stats.doctorsValue, label: dict.stats.doctorsLabel },
    { value: dict.stats.patientsValue, label: dict.stats.patientsLabel },
    { value: dict.stats.departmentsValue, label: dict.stats.departmentsLabel },
  ];
  return (
    <>
      <WhyChooseUs dict={dict} className={className} />
      <StatsStrip stats={stats} />
    </>
  );
}
