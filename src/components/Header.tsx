"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Read theme from document attributes on mount
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  return (
    <header className="site-header">
      <div className="wrap header-container">
        <Link href="/" className="logo">
          <svg
            className="logo-icon"
            viewBox="0 0 32 32"
            width="32"
            height="32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, transition: "transform var(--transition-speed) ease" }}
          >
            <circle cx="16" cy="16" r="15" fill="var(--bg-2)" stroke="var(--line)" strokeWidth="1" />
            <path d="M 8,24 C 11,23 15,17 15,10" stroke="#ffb01f" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 9,21 C 8,19 8,17 10,17 C 11,18 11,20 10,21 Z" fill="#ffd700" />
            <path d="M 11,17 C 10,15 10,13 12,13 C 13,14 13,16 12,17 Z" fill="#ffd700" />
            <path d="M 13,13 C 12,11 12,9 14,9 C 15,10 15,12 14,13 Z" fill="#ffd700" />
            <path d="M 11,22 C 12,20 13,19 14,20 C 14,21 13,23 12,23 Z" fill="#ffd700" />
            <path d="M 13,18 C 14,16 15,15 16,16 C 16,17 15,19 14,19 Z" fill="#ffd700" />
            <path d="M 15,14 C 16,12 17,11 18,12 C 18,13 17,15 16,15 Z" fill="#ffd700" />
            <polygon
              points="21,5 22.5,8 25.5,8 23,10 24,13 21,11 18,13 19,10 16.5,8 19.5,8"
              fill="#ffd700"
              stroke="#e8590c"
              strokeWidth="0.5"
            />
          </svg>
          Agri<span>Synthe</span>
        </Link>

        <nav className="nav-links">
          <Link href="/" className={pathname === "/" ? "active" : ""}>
            Trang Chủ
          </Link>
          <Link href="/about" className={pathname === "/about" ? "active" : ""}>
            Giới Thiệu
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Chuyển chế độ sáng tối"
          >
            {theme === "dark" ? (
              /* Moon Icon (Dark Mode) */
              <svg className="moon-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              /* Sun Icon (Light Mode) */
              <svg className="sun-icon" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05L5.75 4.35a1 1 0 10-1.41 1.41l.71.71zm-2.12 8.796a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM5 9a1 1 0 000 2h1a1 1 0 100-2H5z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
