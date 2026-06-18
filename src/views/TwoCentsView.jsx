import { COLORS } from "../theme";

const TwoCentsView = () => {
  const bills = [
    { name: "Rent", amount: "$1,200", freq: "Monthly", due: "1st Jul" },
    { name: "Council tax", amount: "$180", freq: "Monthly", due: "28th Jun" },
    { name: "Netflix", amount: "$10.99", freq: "Monthly", due: "3rd Jul" },
    { name: "Electricity", amount: "~$85", freq: "Monthly", due: "15th Jul" },
  ];

  const goals = [
    { name: "Japan 2027 🇯🇵", target: 4000, saved: 1240, emoji: "🇯🇵" },
    { name: "New sofa", target: 800, saved: 350, emoji: "🛋️" },
  ];

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Balance */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          background: COLORS.surface,
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Owe Snap
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 400,
            color: COLORS.textPrimary,
            marginBottom: 4,
          }}
        >
          You owe $12.50
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textMuted,
          }}
        >
          from last week's groceries
        </div>
      </div>

      {/* Bills */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Monthly outgoings
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bills.map((bill, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: COLORS.surface,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                  }}
                >
                  {bill.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 2,
                  }}
                >
                  {bill.freq} · due {bill.due}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLORS.textPrimary,
                }}
              >
                {bill.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Fund & Games
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {goals.map((goal, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: COLORS.surface,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                  }}
                >
                  {goal.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: COLORS.textSecondary,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ${goal.saved} / ${goal.target.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: COLORS.surfaceLight,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(goal.saved / goal.target) * 100}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentGlow})`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Phone-first; expands to a desktop layout at >= 760px.

export default TwoCentsView;
