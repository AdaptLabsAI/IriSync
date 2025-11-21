"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  Button,
  Typography,
  Drawer,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  Box,
  Divider,
  IconButton,
  FormControl,
  FormLabel,
  Chip,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
} from "@mui/material"

import Link from "next/link"
// import Close from "@mui/icons-material/Close"
import { Check } from "lucide-react"
import { FaTimes } from "react-icons/fa"

const plans = [
  {
    id: "creator",
    name: "Creator",
    price: 30.0,
    period: "/month",
    description: "Ideal for growing businesses and marketing professionals.",
    highlight: false,
    buttonText: "Start Day Trial",
    buttonLink: "/register?plan=creator",
    features: [
      "Up to 5 unique social accounts",
      "50 AI-generated posts/month",
      "Hashtag recommendations and trending analysis",
      "UTM link builder and tracking",
      "Advanced analytics with export options",
      "Email support",
    ],
  },
  {
    id: "influencer",
    name: "Influencer",
    price: 89.0,
    period: "/month",
    description: "For professional influencers and growing marketing teams.",
    highlight: true,
    buttonText: "Start Day Trial",
    buttonLink: "/register?plan=influencer",
    features: [
      "All Creator features",
      "30 unique social accounts",
      "Unlimited AI content generation",
      "AI-assisted approval workflows",
      "Shared calendar integration",
      "Email White-label reporting",
      "Priority email and chat support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    period: "",
    description: "For organizations requiring advanced features and support.",
    highlight: false,
    buttonText: "Contact Sales",
    buttonLink: "/contact-sales",
    features: [
      "All Influencer features",
      "100+ social accounts",
      "Unlimited users and workspaces",
      "Advanced CRM integrations",
      "AI tone modelling & sentiment tracking",
      "Custom AI model training",
      "Dedicated account manager",
    ],
  },
]

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[number] | null>(null)
  const [billingCycle, setBillingCycle] = useState("monthly")
  const [numberOfUsers, setNumberOfUsers] = useState("01")
  const [autoRenew, setAutoRenew] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openPlanModal = (plan:any) => {
    setSelectedPlan(plan)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const calculatePrice = (basePrice: number, isAnnual: boolean) => {
    if (isAnnual) {
      return basePrice * 12 * 0.8 
    }
    return basePrice
  }

  const calculateTax = (price: number) => {
    return price * 0.1 // 10% tax
  }

  return (
 <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 8 } }}>
  {/* Header */}
 <Box
  sx={{
    mb: { xs: 6, sm: 8 },
    display: "flex",
    flexDirection: { xs: "column", sm: "row" },
    alignItems: "center",
    justifyContent: "space-between",
    textAlign: { xs: "center", sm: "left" },
    gap: 3,
  }}
>
  <Typography
    variant="h2"
    component="h1"
    sx={{
      fontSize: { xs: "1.75rem", sm: "2.5rem", lg: "3rem" },
      fontWeight: 600,
      background: "linear-gradient(45deg, #00FF6A, #00CC44)",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    }}
  >
    Simple transparent <span style={{ color: "#00FF6A" }}>Pricing</span>
  </Typography>

  {/* Toggle Switch */}
  <Box
    sx={{
      display: "flex",
      bgcolor: "grey.100",
      borderRadius: 2,
      p: 0.5,
    }}
  >
    <Button
      onClick={() => setIsAnnual(false)}
      variant={!isAnnual ? "contained" : "text"}
      sx={{
        px: { xs: 2, sm: 4 },
        py: { xs: 1, sm: 1.5 },
        borderRadius: 1.5,
        background: !isAnnual ? "linear-gradient(45deg, #00FF6A, #00CC44)" : "transparent",
        color: !isAnnual ? "white" : "grey.600",
        "&:hover": {
          background: !isAnnual ? "linear-gradient(45deg, #00FF6A, #00CC44)" : "grey.200",
        },
      }}
    >
      Monthly
    </Button>
    <Button
      onClick={() => setIsAnnual(true)}
      variant={isAnnual ? "contained" : "text"}
      sx={{
        px: { xs: 2, sm: 4 },
        py: { xs: 1, sm: 1.5 },
        borderRadius: 1.5,
        background: isAnnual ? "linear-gradient(45deg, #00FF6A, #00CC44)" : "transparent",
        color: isAnnual ? "white" : "grey.600",
        "&:hover": {
          background: isAnnual ? "linear-gradient(45deg, #00FF6A, #00CC44)" : "grey.200",
        },
        flexDirection: "column",
      }}
    >
      <Typography variant="body2">Annually</Typography>
      <Typography variant="caption" sx={{ color: isAnnual ? "white" : "#00FF6A" }}>
        (20% off)
      </Typography>
    </Button>
  </Box>
</Box>


  {/* Pricing Cards */}
  <Grid container justifyContent="center" sx={{ flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
    {plans.map((plan) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={plan.id} sx={{ display: 'flex', justifyContent: 'center' }}>
        <Card
          sx={{
            position: "relative",
            height: "100%",
            width: '100%',
            maxWidth: 460,
            display: "flex",
            flexDirection: "column",
            boxShadow: plan.highlight ? "0 8px 32px rgba(0, 200, 83, 0.1)" : 1,
            "&:hover": {
              boxShadow: plan.highlight ? "0 8px 32px rgba(0, 200, 83, 0.2)" : 3,
            },
          }}
        >
          {plan.highlight && (
            <Chip
              label="MOST POPULAR"
              sx={{
                position: "absolute",
                top: { xs: 17, sm: 23 },
                  left: { md:210,xs: 208, sm: "90%" },
                transform: "translateX(-50%)",
                bgcolor: "#FFD700",
                color: "black",
                fontWeight: "bold",
                fontSize: "0.75rem",
              }}
            />
          )}

          <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
           
            <Box sx={{ mb: 3, pb: 2, borderBottom: "1px solid #e0e0e0" }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                {plan.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {plan.description}
              </Typography>
            </Box>

            {/* Price */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "baseline" }}>
                <Typography variant="h3" component="span" sx={{ fontWeight: "semi-bold", color: "text.primary" }}>
                  {plan.id === "enterprise" ? "Custom" : `$${calculatePrice(plan.price, isAnnual).toFixed(2)}`}
                </Typography>
                {plan.period && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {isAnnual ? "/year" : plan.period}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Button */}
            <Box sx={{ mb: 3 }}>
              {plan.id === "enterprise" ? (
                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    component={Link}
                    href="/contact-sales"
                    variant="outlined"
                    fullWidth
                    sx={{ py: 1.5, whiteSpace: "nowrap" }}
                  >
                    Contact Sales
                  </Button>
                  <Button
                    component={Link}
                    href="/request-demo"
                    variant="outlined"
                    fullWidth
                    sx={{
                      py: 1.5,
                      whiteSpace: "nowrap",
                      borderColor: "#00FF6A",
                      color: "#00FF6A",
                      "&:hover": {
                        borderColor: "#00FF6A",
                        bgcolor: "rgba(0, 255, 106, 0.04)",
                      },
                    }}
                  >
                    Request Demo
                  </Button>
                </Box>
              ) : (
                <Button
                  onClick={() => openPlanModal(plan)}
                  variant={plan.highlight ? "contained" : "outlined"}
                  fullWidth
                  size="lg"
                  sx={{
                    py: 1.5,
                    background: plan.highlight ? "linear-gradient(45deg, #00FF6A, #00CC44)" : "transparent",
                    borderColor: plan.highlight ? "#00FF6A" : "#e0e0e0",
                    "&:hover": {
                      background: plan.highlight
                        ? "linear-gradient(45deg, #00FF6A, #00CC44)"
                        : "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  {plan.buttonText}
                </Button>
              )}
            </Box>

            {/* Features */}
            <List dense sx={{ p: 0 }}>
              {plan.features.map((feature, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Check
                      sx={{
                        fontSize: 20,
                        color: "white",
                        bgcolor: "#00FF6A",
                        borderRadius: "50%",
                        p: 0.25,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={feature}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>

  {/* Footer Note */}
  <Box sx={{ mt: { xs: 4, sm: 6 }, textAlign: "", px: { xs: 2, sm: 0 } }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
      *Enjoy a 7-day free trial exclusively with the Influencer Edition - explore all premium features before you
      commit
    </Typography>
  </Box>

  {/* Drawer Modal */}
  <Drawer
    anchor="right"
    open={drawerOpen}
    onClose={closeDrawer}
    PaperProps={{
      sx: {
        width: { xs: "100%", sm: 400, md: 500 },
        p: 3,
      },
    }}
  >
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
      <Typography variant="h4" component="h2" sx={{ fontWeight: "bold" }}>
        Plan{" "}
        <Box component="span" sx={{ color: "#00FF6A" }}>
          Summary
        </Box>
      </Typography>
      <IconButton onClick={closeDrawer}>
        <FaTimes />
      </IconButton>
    </Box>

    {selectedPlan && (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Great choice. You've selected the{" "}
          <Box component="span" sx={{ fontWeight: 600, color: "#00FF6A" }}>
            {selectedPlan.name} Plan
          </Box>{" "}
          designed to elevate your brand with powerful tools.
        </Typography>

        {/* Billing Cycle */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
            Billing Cycle
          </FormLabel>
          <RadioGroup value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
            <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
            <FormControlLabel
              value="annually"
              control={<Radio />}
              label={
                <Box>
                  Annually{" "}
                  <Typography component="span" variant="caption" color="text.secondary">
                    (20% off)
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Plan Details */}
        <Card sx={{ bgcolor: "grey.50", mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Your plan
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#00FF6A" }}>
                {selectedPlan.name}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No. of users
              </Typography>
              <TextField
                value={numberOfUsers}
                onChange={(e) => setNumberOfUsers(e.target.value)}
                size="sm"
                sx={{ width: 80 }}
                inputProps={{ style: { textAlign: "center" } }}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Plan price
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ${calculatePrice(selectedPlan.price, billingCycle === "annually").toFixed(2)}
                <Typography component="span" variant="caption" color="text.secondary">
                  /{billingCycle === "annually" ? "year" : "month"}
                </Typography>
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Tax
              </Typography>
              <Typography variant="body2">
                ${calculateTax(calculatePrice(selectedPlan.price, billingCycle === "annually")).toFixed(2)} (10%)
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Total Payable
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold", color: "#00FF6A" }}>
                $
                {(
                  calculatePrice(selectedPlan.price, billingCycle === "annually") +
                  calculateTax(calculatePrice(selectedPlan.price, billingCycle === "annually"))
                ).toFixed(2)}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Auto Renew */}
        <FormControlLabel
          control={<Checkbox checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />}
          label={<Typography variant="body2">Auto renew (every month) - Never miss a beat</Typography>}
          sx={{ mb: 4 }}
        />

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button variant="outlined" fullWidth sx={{ py: 1.5 }}>
            Know More
          </Button>
          <Button
            variant="contained"
            fullWidth
            sx={{
              py: 1.5,
              background: "linear-gradient(45deg, #00FF6A, #00CC44)",
              "&:hover": {
                background: "linear-gradient(45deg, #00FF6A, #00CC44)",
              },
            }}
          >
            Continue to Payment
          </Button>
        </Box>
      </Box>
    )}
  </Drawer>
</Container>
  )
}
