import { useState } from 'react';
import './Garden.css';

const SEED_CATALOG = [
  { id: 'sunflower', name: 'Sunflower Seed', flowerName: 'Sunflower', emoji: '🌻', price: 50 },
  { id: 'bluebonnet', name: 'Bluebonnet Seed', flowerName: 'Bluebonnet', emoji: '🪻', price: 50 },
  { id: 'lily', name: 'Lily Seed', flowerName: 'Lily', emoji: '🪷', price: 50 },
  { id: 'rose', name: 'Red Rose Seed', flowerName: 'Red Rose', emoji: '🌹', price: 50 }
];

const WATER_COST_PER_MARK = 20; // 20 PTS = 1 mark (20 water units)
const MAX_WATER = 100; // 5 marks total
const BLOOM_COST = 200; // 200 PTS to bloom a planted seed

function Garden({ userId, userPoints, setUserPoints, onBack }) {
  // Garden state (Structured to mirror Supabase tables: user_gardens & garden_plots)
  const [waterLevel, setWaterLevel] = useState(60); // Starts at 3/5 marks (60/100)
  const [plots, setPlots] = useState([
    { plotIndex: 0, seedType: null, stage: 'empty' },
    { plotIndex: 1, seedType: null, stage: 'empty' },
    { plotIndex: 2, seedType: null, stage: 'empty' },
    { plotIndex: 3, seedType: null, stage: 'empty' }
  ]);

  const [showShop, setShowShop] = useState(false);
  const [toast, setToast] = useState(null);

  function triggerToast(msg, isWarning = false) {
    setToast({ msg, isWarning });
    setTimeout(() => setToast(null), 3500);
  }

  // Shop Action 1: Buy & Plant a Seed (50 PTS)
  function handleBuySeed(seed) {
    if (userPoints < seed.price) {
      triggerToast('Not enough reward points for this seed!', true);
      return;
    }

    const emptyIndex = plots.findIndex((p) => p.stage === 'empty');
    if (emptyIndex === -1) {
      triggerToast('All 4 soil spaces are full! Clear dead plants or bloom existing ones.', true);
      return;
    }

    setUserPoints((prev) => prev - seed.price);
    setPlots((prevPlots) =>
      prevPlots.map((plot, idx) =>
        idx === emptyIndex
          ? { ...plot, seedType: seed.id, stage: 'seeded' }
          : plot
      )
    );
    triggerToast(`Planted ${seed.name} in Soil Space #${emptyIndex + 1}!`);
  }

  // Shop Action 2: Buy 1 Mark of Water (+20 water for 20 PTS)
  function handleBuyWater() {
    if (waterLevel >= MAX_WATER) {
      triggerToast('Water gauge is already full (5/5 marks)!', true);
      return;
    }
    if (userPoints < WATER_COST_PER_MARK) {
      triggerToast('Not enough points to buy water!', true);
      return;
    }

    setUserPoints((prev) => prev - WATER_COST_PER_MARK);
    setWaterLevel((prev) => Math.min(MAX_WATER, prev + 20));
    triggerToast('Added +1 water mark (+20) to your garden gauge!');
  }

  // Shop Action 3: Bloom a Planted Seed (200 PTS)
  function handleBuyBloom(seedId) {
    if (userPoints < BLOOM_COST) {
      triggerToast('You need 200 PTS to bloom a flower!', true);
      return;
    }

    const targetIndex = plots.findIndex(
      (p) => p.stage === 'seeded' && p.seedType === seedId
    );

    if (targetIndex === -1) {
      triggerToast('Plant that seed in your soil first before blooming it!', true);
      return;
    }

    const seedInfo = SEED_CATALOG.find((s) => s.id === seedId);
    setUserPoints((prev) => prev - BLOOM_COST);
    setPlots((prevPlots) =>
      prevPlots.map((plot, idx) =>
        idx === targetIndex ? { ...plot, stage: 'bloomed' } : plot
      )
    );
    triggerToast(`Your ${seedInfo.flowerName} in Space #${targetIndex + 1} has bloomed!`);
  }

  // Clear dead plant so user can replant
  function handleClearPlot(plotIndex) {
    setPlots((prevPlots) =>
      prevPlots.map((plot) =>
        plot.plotIndex === plotIndex
          ? { ...plot, seedType: null, stage: 'empty' }
          : plot
      )
    );
    triggerToast(`Cleared Soil Space #${plotIndex + 1}. Ready for a new seed!`);
  }

  // Testing Helper: Simulate End of Day (1-Day Empty Rule)
  function handleSimulateEndOfDay() {
    const hasLivingPlants = plots.some(
      (p) => p.stage === 'seeded' || p.stage === 'bloomed'
    );

    if (waterLevel === 0) {
      if (hasLivingPlants) {
        setPlots((prevPlots) =>
          prevPlots.map((plot) =>
            plot.stage === 'seeded' || plot.stage === 'bloomed'
              ? { ...plot, stage: 'dead' }
              : plot
          )
        );
        triggerToast(
          'Day ended with an empty water gauge! Unwatered plants have died and must be replanted.',
          true
        );
      } else {
        triggerToast('A new day started. Your empty garden is ready for seeds.');
      }
      return;
    }

    // Consume 1 mark (20 water) overnight
    const nextWater = Math.max(0, waterLevel - 20);
    setWaterLevel(nextWater);

    if (nextWater === 0 && hasLivingPlants) {
      triggerToast(
        'New day! Water gauge is now EMPTY (0/5). Buy water before the end of today or plants will die!',
        true
      );
    } else {
      triggerToast(`New day! Garden used 1 water mark overnight (${nextWater}/100 remaining).`);
    }
  }

  const waterMarks = Math.floor(waterLevel / 20);

  function getWaterStatusLabel() {
    if (waterMarks === 0) return { text: 'EMPTY - Water Today!', bg: '#ef4444', color: '#fff' };
    if (waterMarks <= 2) return { text: 'Low Water (Half-Wilted)', bg: '#f59e0b', color: '#0f172a' };
    return { text: 'Healthy Hydration', bg: '#10b981', color: '#0f172a' };
  }

  const waterStatus = getWaterStatusLabel();

  // Render helper for each soil plot
  function renderPlotVisual(plot) {
    if (plot.stage === 'empty') {
      return <span style={{ fontSize: '42px', opacity: 0.35 }}>🟫</span>;
    }

    const seedInfo = SEED_CATALOG.find((s) => s.id === plot.seedType);

    if (plot.stage === 'seeded') {
      // Lump of soil with tiny sprout
      return (
        <div className="anim-soil" style={{ position: 'relative' }}>
          <span>🟤</span>
          <span style={{ fontSize: '28px', position: 'absolute', top: '-10px', left: '22px' }}>
            🌱
          </span>
        </div>
      );
    }

    if (plot.stage === 'dead') {
      return <span className="anim-dead">🥀</span>;
    }

    // Stage === 'bloomed' -> Apply animation based on water gauge marks
    let animClass = 'anim-healthy';
    if (waterMarks === 0) animClass = 'anim-critical';
    else if (waterMarks <= 2) animClass = 'anim-half-wilt';

    return <span className={animClass}>{seedInfo ? seedInfo.emoji : '🌸'}</span>;
  }

  function getPlotStatusLabel(plot) {
    if (plot.stage === 'empty') return 'Empty Soil Space';
    const seedInfo = SEED_CATALOG.find((s) => s.id === plot.seedType);
    if (plot.stage === 'seeded') return `${seedInfo?.name} (Soil Mound)`;
    if (plot.stage === 'dead') return `Withered ${seedInfo?.flowerName}`;
    if (waterMarks === 0) return `${seedInfo?.flowerName} (Critical - Needs Water!)`;
    if (waterMarks <= 2) return `${seedInfo?.flowerName} (Half-Wilted)`;
    return `Blooming ${seedInfo?.flowerName}`;
  }

  return (
    <div className="garden-page">
      {/* TOP ROW: Extra-Large Icons & Buttons */}
      <header className="garden-top-bar">
        <div className="garden-top-left">
          <button
            type="button"
            className="garden-xl-btn secondary"
            onClick={onBack}
          >
            <span className="garden-xl-icon">⬅️</span>
            <span>Dashboard</span>
          </button>

          <div className="garden-xl-badge">
            <span className="garden-xl-icon">🦉</span>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>
                REWARD POINTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8' }}>
                {userPoints} PTS
              </div>
            </div>
          </div>
        </div>

        <div className="garden-top-right">
          <button
            type="button"
            className="garden-xl-btn test-btn"
            onClick={handleSimulateEndOfDay}
            title="Test daily water consumption and 1-day empty rule"
          >
            <span className="garden-xl-icon">⏭️</span>
            <span>End Day (Test)</span>
          </button>

          <button
            type="button"
            className="garden-xl-btn"
            onClick={() => setShowShop(true)}
          >
            <span className="garden-xl-icon">🛒</span>
            <span>Garden Shop</span>
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {toast && (
        <div className={`garden-toast ${toast.isWarning ? 'warning' : ''}`}>
          {toast.msg}
        </div>
      )}

      {/* MIDDLE ROW: Centered Water Gauge Bar (5 marks = 100 pts worth of water) */}
      <section className="water-gauge-section">
        <div className="water-gauge-header">
          <div className="water-gauge-title">
            <span style={{ fontSize: '28px' }}>💦</span>
            <span>Water Gauge ({waterMarks}/5 Marks)</span>
          </div>
          <span
            className="water-status-pill"
            style={{ backgroundColor: waterStatus.bg, color: waterStatus.color }}
          >
            {waterStatus.text}
          </span>
        </div>

        <div className="water-segments">
          {[1, 2, 3, 4, 5].map((mark) => {
            const isFilled = waterMarks >= mark;
            const healthClass = waterMarks <= 2 ? 'low' : 'healthy';
            return (
              <div
                key={mark}
                className={`water-segment ${isFilled ? `filled ${healthClass}` : ''}`}
              />
            );
          })}
        </div>

        <p className="water-gauge-subtext">
          1 mark (20 water) is used each day. If the gauge stays empty at the end of the day, plants die.
        </p>
      </section>

      {/* BOTTOM ROW: 4 Empty Soil Spaces Garden */}
      <section className="garden-bed-container">
        <div className="garden-bed-header">
          <h2 style={{ margin: '0 0 6px 0', fontSize: '24px' }}>My Night Owl Garden</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Buy seeds and water in the shop to grow your 4-plot garden!
          </p>
        </div>

        <div className="garden-grid">
          {plots.map((plot) => (
            <div key={plot.plotIndex} className="garden-plot">
              <span className="plot-label">Soil Space #{plot.plotIndex + 1}</span>
              <div className="plot-visual">{renderPlotVisual(plot)}</div>
              <div className="plot-footer">
                <div className="plot-status-text">{getPlotStatusLabel(plot)}</div>
                {plot.stage === 'dead' && (
                  <button
                    type="button"
                    className="clear-dead-btn"
                    onClick={() => handleClearPlot(plot.plotIndex)}
                  >
                    Clear & Replant
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GARDEN SHOP MODAL */}
      {showShop && (
        <div className="shop-modal-backdrop">
          <div className="shop-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px' }}>🛒 Night Owl Garden Shop</h2>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
                  Current Balance: <strong style={{ color: '#38bdf8' }}>{userPoints} PTS</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShop(false)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                X
              </button>
            </div>

            {/* Section 1: Water */}
            <h3 className="shop-section-title">💦 Hydration Supplies</h3>
            <div className="shop-grid">
              <div className="shop-item-card">
                <div className="shop-item-icon">💦</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>+1 Water Mark</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Adds +20 to gauge ({waterMarks}/5 full)
                  </div>
                </div>
                <button
                  type="button"
                  className="shop-buy-btn"
                  disabled={userPoints < WATER_COST_PER_MARK || waterLevel >= MAX_WATER}
                  onClick={handleBuyWater}
                >
                  {waterLevel >= MAX_WATER ? 'Gauge Full' : `Buy (${WATER_COST_PER_MARK} PTS)`}
                </button>
              </div>
            </div>

            {/* Section 2: Seeds (50 PTS each) */}
            <h3 className="shop-section-title">🌱 Seeds (50 PTS Each)</h3>
            <div className="shop-grid">
              {SEED_CATALOG.map((seed) => {
                const hasEmptyPlot = plots.some((p) => p.stage === 'empty');
                return (
                  <div key={seed.id} className="shop-item-card">
                    <div className="shop-item-icon">{seed.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{seed.name}</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        Plants a soil mound
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shop-buy-btn"
                      disabled={userPoints < seed.price || !hasEmptyPlot}
                      onClick={() => handleBuySeed(seed)}
                    >
                      {!hasEmptyPlot ? 'No Empty Soil' : `Buy (${seed.price} PTS)`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Section 3: Bloom Upgrades (200 PTS each) */}
            <h3 className="shop-section-title">✨ Instant Flower Bloom (200 PTS Each)</h3>
            <div className="shop-grid">
              {SEED_CATALOG.map((seed) => {
                const hasPlantedSeed = plots.some(
                  (p) => p.stage === 'seeded' && p.seedType === seed.id
                );
                return (
                  <div key={`bloom-${seed.id}`} className="shop-item-card">
                    <div className="shop-item-icon">{seed.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        Bloom {seed.flowerName}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {hasPlantedSeed
                          ? 'Ready to bloom!'
                          : `Plant ${seed.name} first`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shop-buy-btn"
                      disabled={userPoints < BLOOM_COST || !hasPlantedSeed}
                      onClick={() => handleBuyBloom(seed.id)}
                    >
                      Bloom ({BLOOM_COST} PTS)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Garden;