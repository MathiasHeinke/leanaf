import React from "react";
import { BodyMeasurements } from "./BodyMeasurements";

interface QuickMeasurementsInputProps {
  onMeasurementsAdded?: () => void;
  todaysMeasurements?: any;
}

export const QuickMeasurementsInput: React.FC<QuickMeasurementsInputProps> = ({
  onMeasurementsAdded,
  todaysMeasurements,
}) => {
  return (
    <BodyMeasurements
      onMeasurementsAdded={onMeasurementsAdded}
      todaysMeasurements={todaysMeasurements}
    />
  );
};
