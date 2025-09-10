Migration Flow Analysis PoC | FT Hub

# Migration flow *adjustment* “model” for structured speculation

Brief specs on the approach to creating a “flow adjustment slider” to see effects including assumptions and limitations

## Methodology & Limitations

## Data Foundation

**Source Data:** Facebook-derived bilateral migration flows (2019-2022)

- 1.5 million rows of monthly country-to-country movement data  
- Format: Origin country → Destination country → Month → Number of migrants  
- Coverage: Global scope with 48 months of observations

G. Chi, G.J. Abel, D. Johnston, E. Giraudy, & M. Bailey, Measuring global migration flows using online data, Proc. Natl. Acad. Sci. U.S.A. 122 (18) e2409418122, https://doi.org/10.1073/pnas.2409418122 (2025).

**Key Limitation:** This tool analyzes historical patterns only. Data ends December 2022 and provides no real-time migration tracking capability.

## Slider Methodology

### Core Mathematical Model

When users adjust migration flows between countries A and B:

```
New Flow = Historical Average × (1 + User Percentage Adjustment)
```

### Flow Redistribution Logic

**Proportional Redistribution Assumption:** When flows increase from Country A to Country B, the additional migrants are proportionally reduced from all other destinations that receive migrants from Country A, based on historical flow volumes.

**Mathematical Implementation:**

- If Syria→Turkey increases by 500 people/month  
- Reduction distributed across Syria→Jordan, Syria→Lebanon, etc.  
- Each destination's reduction \= (500 × Destination's historical share of total Syrian outflows)

### Bounds and Validation

**Adjustment Limits:** Sliders capped at ±300% based on maximum observed volatility in the 2019-2022 dataset (including pandemic disruptions)

**Confidence Indicators:**

- Green: Changes within ±100% of historical range  
- Yellow: Changes 100-300% of historical range  
- Red: Changes \>300% (highly speculative)

## Critical Assumptions

### Flow Redistribution Assumptions

1. **Zero-sum migration assumption:** Total outflows from any country remain constant; only destinations change  
2. **Proportional preference stability:** Historical destination preferences predict how flows redistribute  
3. **No capacity constraints:** Destination countries can absorb any volume of additional migrants  
4. **Linear relationship assumption:** A 50% intervention creates exactly 50% flow change

### Temporal Assumptions

5. **Pattern persistence:** Monthly flow patterns observed 2019-2022 represent stable underlying relationships  
6. **Seasonality stability:** Regular seasonal migration patterns continue unchanged  
7. **No structural breaks:** Major global changes (wars, economic crises) do not fundamentally alter migration systems

## Data Limitations

### Demographic Bias

**Facebook User Skew:** Data represents Facebook users, which skews toward:

- Younger populations (18-45 years)  
- Urban populations with internet access  
- Higher income/education levels in developing countries  
- Populations with active social networks

**Missing Populations:** Underrepresents refugees, irregular migrants, and rural populations with limited connectivity.

### Geographic Coverage Gaps

**Incomplete Bilateral Coverage:** Some country pairs may have insufficient data for reliable analysis, particularly smaller nations or restricted-access countries.

**Administrative vs. Behavioral Definition:** Facebook data captures behavioral movement patterns, not official administrative migration statistics.

## Analytical Risks

### Model Risks

1. **Correlation vs. Causation:** Tool cannot distinguish between correlation and causation in flow patterns  
2. **Intervention Effectiveness Unknown:** No validation of how real interventions affect actual flows  
3. **Compound Effects Ignored:** Multiple simultaneous interventions may have non-linear interactions  
4. **External Shock Vulnerability:** Model assumes normal conditions; major crises invalidate assumptions

### Interpretation Risks

5. **Precision Illusion:** Numerical outputs may appear more precise than underlying data supports  
6. **Oversimplification:** Complex interventions reduced to simple percentage adjustments  
7. **Temporal Misalignment:** Historical patterns may not predict future responses to intervention types

## Appropriate Use Cases

### Recommended Applications

- **Pattern Recognition:** Identifying historical migration corridors and seasonal variations  
- **Scenario Planning:** Exploring "what-if" questions for strategic planning purposes  
- **Stakeholder Communication:** Visualizing potential trade-offs and intervention effects  
- **Research Hypothesis Generation:** Identifying relationships for further investigation

### Inappropriate Applications

- **Operational Planning:** Real-time refugee response or border management decisions  
- **Budget Allocation:** Precise resource planning based on projected flows  
- **Predictive Forecasting:** Claiming to predict actual future migration volumes  
- **Evaluation:** Assessing effectiveness of implemented interventions

## Validation Framework

### Internal Consistency Checks

- Mathematical conservation: Global inflows equal global outflows  
- Temporal consistency: Trends align with observed historical patterns  
- Magnitude validation: Changes remain within observed historical bounds

### External Reality Checks

- Cross-reference major corridors against UN migration statistics  
- Validate pandemic-period patterns against known disruptions  
- Compare regional trends with academic migration literature

## Transparency Requirements

**Users Must Understand:**

1. This tool explores historical patterns, not future predictions  
2. Slider adjustments represent theoretical scenarios, not validated policy effects  
3. Facebook data has demographic and geographic limitations  
4. Results should inform discussion, not direct policy implementation  
5. All scenarios require validation with additional data sources and expert judgment

# Appendix 

## Core Mathematical Model

**Base Calculation:**

```
New_Flow(A→B) = Historical_Flow(A→B) × (1 + slider_percentage)
```

**Cascading Logic:** When you increase flows A→B, you need to handle two effects:

1. **Source country adjustment** (where does the extra flow come from?)  
2. **Destination country redistribution** (how does this affect other receiving countries?)

## Simple Redistribution Algorithm

**Option 1: Proportional Redistribution**

```
If increasing A→B by X people:
- Decrease all other flows FROM A proportionally
- Total_other_flows_from_A = Sum of all A→(not B) flows
- For each A→C flow: New_Flow(A→C) = Old_Flow(A→C) × (1 - X/Total_outflow_from_A)
```

**Option 2: Historical Preference Weighting**

```
When redistributing flows TO country B:
- Calculate B's historical "market share" of global migration
- B_share = Total_flows_to_B / Total_global_flows
- Redistribute the change across other destination countries based on their relative shares
```

## Practical Implementation

**Step 1: Baseline Calculation**

```py
# User selects: Syria→Turkey, increase by 50%
baseline_flow = get_historical_average(Syria, Turkey)  # e.g., 1000 people/month
new_flow = baseline_flow * 1.5  # 1500 people/month
change_amount = new_flow - baseline_flow  # +500 people
```

**Step 2: Source Country Redistribution**

```py
# Where do the extra 500 come from?
other_syria_destinations = get_all_flows_from(Syria, exclude=Turkey)
total_other_outflow = sum(other_syria_destinations.values())

for destination, flow in other_syria_destinations.items():
    proportional_reduction = (change_amount * flow) / total_other_outflow
    new_other_flows[destination] = flow - proportional_reduction
```

**Step 3: Bounds Checking**

```py
# Don't let any flow go negative
# Don't exceed 3x historical maximum (based on your pandemic volatility)
max_reasonable_change = 3 * historical_max_for_corridor
min_flow = 0

new_flow = min(max_reasonable_change, max(min_flow, calculated_flow))
```

## Confidence Indicators

**Traffic Light System:**

- **Green (high confidence):** Changes within ±100% of historical range  
- **Yellow (medium confidence):** Changes 100-300% of historical range  
- **Red (speculative):** Changes \>300% of historical range

**Historical Precedent Flagging:**

```py
if abs(percentage_change) > max_observed_change_in_data:
    show_warning("This exceeds largest historical change observed: {max_change}%")
```

## Display Logic

**Show Three Numbers:**

1. **Original flow:** "Historical average: 1,000/month"  
2. **New flow:** "Adjusted flow: 1,500/month (+50%)"  
3. **Affected flows:** "Redistributed from: Syria→Jordan (-200), Syria→Lebanon (-300)"

**Temporal Context:**

```py
# Reference historical volatility
historical_std = calculate_standard_deviation(corridor_flows)
if change_amount > 2 * historical_std:
    note = "This change is larger than typical monthly variation"
```

## Technical Constraints

**Maximum Adjustment Limits:**

- Cap sliders at ±300% based on your pandemic period showing that even massive disruptions rarely exceeded this  
- Warn users when approaching bounds of observed historical data  
- Always maintain mathematical consistency (total outflows \= total inflows globally)

**Validation Check:**

```py
def validate_adjustment(country_a, country_b, percentage):
    historical_range = get_historical_range(country_a, country_b)
    if abs(percentage) > 300:
        return "Warning: Exceeds observed historical variation"
    elif abs(percentage) > 100:
        return "Caution: Large change, limited historical precedent"
    else:
        return "Within typical historical variation range"
```
