import DashboardBox from "@/components/DashboardBox";
import FlexBetween from "@/components/FlexBetween";
import { useGetKpisQuery } from "@/state/api";
import { Box, Button, Typography, useTheme } from "@mui/material";
import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import regression, { DataPoint } from "regression";

const Predictions = () => {
  const { palette } = useTheme();
  const [isPredictions, setIsPredictions] = useState(false);
  const { data: kpiData } = useGetKpisQuery();

  const formattedData = useMemo(() => {
    if (!kpiData) return [];
    const monthData = kpiData[0].monthlyData;

    const formatted: Array<DataPoint> = monthData.map(
      ({ revenue }, i: number) => {
        return [i, revenue];
      }
    );
    const regressionLine = regression.linear(formatted);

    return monthData.map(({ month, revenue }, i: number) => {
      return {
        name: month,
        "Actual Revenue": revenue,
        "Regression Line": regressionLine.points[i][1],
        "Predicted Revenue": regressionLine.predict(i + 12)[1],
      };
    });
  }, [kpiData]);


  const stats = useMemo(() => {
    if (!kpiData) return null;

    const monthData = kpiData[0].monthlyData;
    const points: Array<DataPoint> = monthData.map(({ revenue }, i) => [i, revenue]);

    // test = останні 2 місяці 
    const testSize = Math.min(2, Math.max(1, points.length - 2));
    const train = points.slice(0, points.length - testSize);
    const test = points.slice(points.length - testSize);

    const model = regression.linear(train);

    const yTrue = test.map((p) => p[1] as number);
    const yPred = test.map((p) => model.predict(p[0] as number)[1] as number);

    const n = yTrue.length;
    const mae = yTrue.reduce((s, y, i) => s + Math.abs(y - yPred[i]), 0) / n;
    const rmse = Math.sqrt(
      yTrue.reduce((s, y, i) => s + (y - yPred[i]) ** 2, 0) / n
    );
    const mape =
      (yTrue.reduce((s, y, i) => s + Math.abs((y - yPred[i]) / (y || 1)), 0) / n) *
      100;

    const mean = yTrue.reduce((s, y) => s + y, 0) / n;
    const ssTot = yTrue.reduce((s, y) => s + (y - mean) ** 2, 0);
    const ssRes = yTrue.reduce((s, y, i) => s + (y - yPred[i]) ** 2, 0);
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    return { trainN: train.length, testN: test.length, mae, rmse, mape, r2 };
  }, [kpiData]);

  return (
    <DashboardBox width="100%" height="100%" p="1rem" overflow="hidden">
      <FlexBetween m="1rem 2.5rem" gap="1rem">
        <Box>
          <Typography variant="h3">Revenue and Predictions</Typography>
          <Typography variant="h6">
            Charted revenue and predicted revenue based on a simple linear
            regression model
          </Typography>
          {stats && (
            <Typography variant="body2" sx={{ mt: "0.25rem", color: palette.grey[400] }}>
                Train: {stats.trainN} • Test: {stats.testN} • MAE: ${stats.mae.toFixed(2)} •
                RMSE: ${stats.rmse.toFixed(2)} • MAPE: {stats.mape.toFixed(2)}% • R²:{" "}
                {stats.r2.toFixed(3)}
            </Typography>
            )}
        </Box>
        <Button
          onClick={() => setIsPredictions(!isPredictions)}
          sx={{
            color: palette.grey[900],
            backgroundColor: palette.grey[700],
            boxShadow: "0.1rem 0.1rem 0.1rem 0.1rem rgba(0,0,0,.4)",
          }}
        >
          Show Predicted Revenue for Next Year
        </Button>
      </FlexBetween>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{
            top: 20,
            right: 75,
            left: 20,
            bottom: 80,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grey[800]} />
          <XAxis dataKey="name" tickLine={false} style={{ fontSize: "10px" }}>
            <Label value="Month" offset={-5} position="insideBottom" />
          </XAxis>
          <YAxis
            domain={[12000, 26000]}
            axisLine={{ strokeWidth: "0" }}
            style={{ fontSize: "10px" }}
            tickFormatter={(v) => `$${v}`}
          >
            <Label
              value="Revenue in USD"
              angle={-90}
              offset={-5}
              position="insideLeft"
            />
          </YAxis>
          <Tooltip />
          <Legend verticalAlign="top" />
          <Line
            type="monotone"
            dataKey="Actual Revenue"
            stroke={palette.primary.main}
            strokeWidth={0}
            dot={{ strokeWidth: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Regression Line"
            stroke="#8884d8"
            dot={false}
          />
          {isPredictions && (
            <Line
              strokeDasharray="5 5"
              dataKey="Predicted Revenue"
              stroke={palette.secondary[500]}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </DashboardBox>
  );
};

export default Predictions;