"use client"

import { Box, Card, CardContent, Typography, Grid } from "@mui/material"
import { styled } from "@mui/material/styles"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"


const StatCard = styled(Card)<{ color: string }>(({ theme, color }) => ({
  borderRadius: 16,
  background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
  border: `1px solid ${color}20`,
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
  },
}))

type Stat = {
  label: string
  value: string
  change: number
  increasing: boolean
}

type DashboardStatsProps = {
  stats: Stat[]
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statColors = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0"]

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <StatCard color={statColors[index]}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold" color="text.primary">
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {stat.label}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {stat.increasing ? (
                    <TrendingUpIcon sx={{ color: "#4CAF50", fontSize: 16 }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: "#f44336", fontSize: 16 }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{ color: stat.increasing ? "#4CAF50" : "#f44336", fontWeight: "bold" }}
                  >
                    {stat.change}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {stat.increasing ? "+" : ""}
                {stat.change}% from last month
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
      ))}
    </Grid>
  )
}
