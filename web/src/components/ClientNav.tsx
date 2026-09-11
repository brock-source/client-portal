import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Onboarding", path: "/journey" },
  { label: "Ask Brock", path: "/ask-brock" },
  { label: "My Coverage", path: "/coverage" },
];

const GOLD_COLOR = "#c9a859";

export function ClientNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [barStyle, setBarStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isActive = (path: string) => location.pathname === path;
  const activeIndex = NAV_ITEMS.findIndex((item) => item.path === location.pathname);
  const displayIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;

  useEffect(() => {
    if (displayIndex >= 0 && navRefs.current[displayIndex]) {
      const button = navRefs.current[displayIndex];
      setBarStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      });
    }
  }, [displayIndex]);

  return (
    <>
      <style>{`
        .client-nav-bar {
          position: relative;
          display: flex;
          gap: 0;
          padding: 0;
          margin: 0;
          align-items: center;
        }

        .client-nav-item {
          padding: 16px 20px;
          background: transparent;
          border: none;
          color: var(--navy-700, #1a2b4d);
          font-family: var(--font-label, -apple-system, BlinkMacSystemFont, sans-serif);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s ease;
          white-space: nowrap;
        }

        .client-nav-item:hover {
          color: var(--navy-900, #0d1117);
        }

        .client-nav-underline {
          position: absolute;
          bottom: 0;
          height: 3px;
          background: ${GOLD_COLOR};
          transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <nav className="client-nav-bar" onMouseLeave={() => setHoveredIndex(null)}>
        <div
          className="client-nav-underline"
          style={{
            left: `${barStyle.left}px`,
            width: `${barStyle.width}px`,
          }}
        />
        {NAV_ITEMS.map((item, index) => (
          <button
            key={item.path}
            ref={(el) => {
              navRefs.current[index] = el;
            }}
            onClick={() => navigate(item.path)}
            className="client-nav-item"
            onMouseEnter={() => setHoveredIndex(index)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
