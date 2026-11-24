
import { useEffect, useState } from "react";
import axios from "axios";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const API_URL = "http://localhost:3000";

interface PriceHistoryEntry {
  id: string;
  price: string;
  recordedAt: string;
}

interface MarketplaceHistory {
  historyId: string;
  marketplaceId: string;
  marketplaceName: string;
  entries: PriceHistoryEntry[];
}

interface PriceHistoryProps {
  productId: string;
}

const PriceHistory = ({ productId }: PriceHistoryProps) => {
  const [history, setHistory] = useState<MarketplaceHistory[]>([]);
  const [activeMarketplace, setActiveMarketplace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get<{ history: MarketplaceHistory[] }>(
          `${API_URL}/product/${productId}/history`
        );

        const historyData = response.data.history || [];

        setHistory(historyData);

        setActiveMarketplace(
          historyData.length > 0 ? historyData[0].marketplaceId : null
        );
      } catch (err) {
        console.error("Failed to fetch price history:", err);
        setError("Unable to load price history.");
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [productId]);

  const selectedHistory = history.find(
    item => item.marketplaceId === activeMarketplace
  );

  // Prepare data for Recharts
  const chartData = selectedHistory?.entries
    .map(entry => ({
      price: Number(entry.price),
      recordedAt: entry.recordedAt,
      date: new Date(entry.recordedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short"
      })
    }))
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() -
        new Date(b.recordedAt).getTime()
    ) || [];

  if (loading) {
    return <section className="price-history-section">
      <p>Loading price history...</p>
    </section>;
  }

  if (error) {
    return <section className="price-history-section">
      <p className="history-error">{error}</p>
    </section>;
  }

  return (
    <section className="price-history-section">

      <div className="history-heading">
        <div>
          <span className="product-tag">PRICE TRACKING</span>
          <h2>Price History</h2>
          <p>Track how this product's price changes across marketplaces.</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <h3>No price history available</h3>
          <p>Price history will appear after price updates.</p>
        </div>
      ) : (
        <>
          <div className="history-marketplace-toggles">
            {history.map(item => (
              <button
                key={item.marketplaceId}
                type="button"
                className={`history-toggle ${
                  activeMarketplace === item.marketplaceId ? "active" : ""
                }`}
                onClick={() =>
                  setActiveMarketplace(current =>
                    current === item.marketplaceId
                      ? null
                      : item.marketplaceId
                  )
                }
              >
                {item.marketplaceName}
              </button>
            ))}
          </div>

          {selectedHistory && (
            <div className="history-content">

              <h3>{selectedHistory.marketplaceName} Price Trend</h3>

              {chartData.length === 0 ? (
                <p>No recorded prices for this marketplace.</p>
              ) : (
                <div style={{ width: "100%", height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 25,
                        left: 20,
                        bottom: 10
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                      />

                      <YAxis
                        tickFormatter={value =>
                          `₹${Number(value).toLocaleString("en-IN")}`
                        }
                        domain={["auto", "auto"]}
                      />

                      <Tooltip
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.recordedAt
                            ? new Date(
                                payload[0].payload.recordedAt
                              ).toLocaleString("en-IN")
                            : ""
                        }
                        formatter={value => [
                          `₹${Number(value).toLocaleString("en-IN")}`,
                          "Price"
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PriceHistory;
