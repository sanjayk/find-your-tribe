import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home (Landing Page)", () => {
  // ─── Hero Section ───
  describe("Hero section", () => {
    it("renders the hero heading", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", {
          name: /your reputation is what you build/i,
        })
      ).toBeInTheDocument();
    });

    it("renders the hero subtitle", () => {
      render(<Home />);
      expect(
        screen.getByText(
          /a social network where clout comes from shipping/i
        )
      ).toBeInTheDocument();
    });

    it("renders the GitHub CTA button", () => {
      render(<Home />);
      expect(
        screen.getByRole("button", { name: /continue with github/i })
      ).toBeInTheDocument();
    });

    it('renders the "See how it works" link', () => {
      render(<Home />);
      expect(
        screen.getByText(/see how it works/i)
      ).toBeInTheDocument();
    });

    it("renders social proof stats", () => {
      render(<Home />);
      expect(screen.getByText("2,847")).toBeInTheDocument();
      expect(screen.getByText("builders joined")).toBeInTheDocument();
      expect(screen.getByText("612")).toBeInTheDocument();
      expect(screen.getByText("projects shipped")).toBeInTheDocument();
      expect(screen.getByText("184")).toBeInTheDocument();
      expect(screen.getByText("active tribes")).toBeInTheDocument();
    });
  });

  // ─── How It Works Section ───
  describe("How It Works section", () => {
    it("renders 3 numbered steps", () => {
      render(<Home />);
      expect(screen.getByText("01")).toBeInTheDocument();
      expect(screen.getByText("02")).toBeInTheDocument();
      expect(screen.getByText("03")).toBeInTheDocument();
    });

    it("renders step titles", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /ship your work/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /form your tribe/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /earn your score/i })
      ).toBeInTheDocument();
    });

    it("renders step descriptions", () => {
      render(<Home />);
      expect(
        screen.getByText(/connect github\. import projects/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/find builders with complementary skills/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/your builder score reflects real contributions/i)
      ).toBeInTheDocument();
    });
  });

  // ─── Builders Section ───
  describe("Builders section", () => {
    it("renders the Builders section heading", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /^builders$/i })
      ).toBeInTheDocument();
    });

    it("renders featured builder Maya Chen", () => {
      render(<Home />);
      const headings = screen.getAllByRole("heading", {
        name: /maya chen/i,
      });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Maya Chen's role and bio", () => {
      render(<Home />);
      expect(
        screen.getAllByText(/full-stack developer/i).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(
          /building ai-powered tools for makers/i
        )
      ).toBeInTheDocument();
    });

    it("renders 4 list builders", () => {
      render(<Home />);
      expect(
        screen.getAllByRole("heading", { name: /james okafor/i }).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByRole("heading", { name: /priya sharma/i }).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByRole("heading", { name: /david morales/i }).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByRole("heading", { name: /sarah kim/i }).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Projects Section ───
  describe("Projects section", () => {
    it("renders the Projects section heading", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /^projects$/i })
      ).toBeInTheDocument();
    });

    it("renders the hero project AI Resume Builder", () => {
      render(<Home />);
      const headings = screen.getAllByRole("heading", {
        name: /ai resume builder/i,
      });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it("renders compact project Tribe Finder", () => {
      render(<Home />);
      const headings = screen.getAllByRole("heading", {
        name: /tribe finder/i,
      });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it("renders compact project Open Source CRM", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /open source crm/i })
      ).toBeInTheDocument();
    });
  });

  // ─── Feed Section ───
  describe("Feed section", () => {
    it("renders the Feed section heading", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /^feed$/i })
      ).toBeInTheDocument();
    });

    it("renders filter tabs", () => {
      render(<Home />);
      expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^ships$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^tribes$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^people$/i })).toBeInTheDocument();
    });

    it("renders Maya shipped feed item", () => {
      render(<Home />);
      expect(screen.getAllByText(/shipped/i).length).toBeGreaterThanOrEqual(1);
    });

    it("renders Priya formed a tribe feed item", () => {
      render(<Home />);
      expect(screen.getByText(/formed a tribe/i)).toBeInTheDocument();
    });

    it("renders Alex started building feed item", () => {
      render(<Home />);
      expect(screen.getByText(/started building/i)).toBeInTheDocument();
    });

    it("renders James joined feed item", () => {
      render(<Home />);
      expect(screen.getByText(/joined find your tribe/i)).toBeInTheDocument();
    });
  });

  // ─── Profile Preview Section ───
  describe("Profile Preview section", () => {
    it("renders the Builder profile overline", () => {
      render(<Home />);
      expect(screen.getByText(/builder profile/i)).toBeInTheDocument();
    });

    it("renders the profile sidebar with builder score", () => {
      render(<Home />);
      // Maya's builder score of 72 appears in multiple places; verify at least in profile
      const scores = screen.getAllByText("72");
      expect(scores.length).toBeGreaterThanOrEqual(1);
    });

    it("renders profile stats", () => {
      render(<Home />);
      expect(screen.getByText("Projects shipped")).toBeInTheDocument();
      expect(screen.getAllByText("Tribes").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Joined")).toBeInTheDocument();
    });

    it("renders shipped projects in profile main content", () => {
      render(<Home />);
      expect(
        screen.getAllByText(/shipped projects/i).length
      ).toBeGreaterThanOrEqual(1);
    });

    it("renders frequent collaborators", () => {
      render(<Home />);
      expect(
        screen.getByText(/frequent collaborators/i)
      ).toBeInTheDocument();
    });
  });

  // ─── Tribe Preview Section ───
  describe("Tribe Preview section", () => {
    it("renders the Hospitality OS tribe heading", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /hospitality os/i })
      ).toBeInTheDocument();
    });

    it("renders tribe description", () => {
      render(<Home />);
      expect(
        screen.getByText(
          /building the operating system for modern hospitality/i
        )
      ).toBeInTheDocument();
    });

    it("renders team members", () => {
      render(<Home />);
      expect(screen.getByText(/^team$/i)).toBeInTheDocument();
    });

    it("renders open roles section", () => {
      render(<Home />);
      expect(screen.getByText(/open roles/i)).toBeInTheDocument();
    });

    it("renders Backend Engineer role card", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /^backend engineer$/i })
      ).toBeInTheDocument();
    });

    it("renders Growth Marketer role card", () => {
      render(<Home />);
      expect(
        screen.getByRole("heading", { name: /^growth marketer$/i })
      ).toBeInTheDocument();
    });

    it("renders Request to join buttons", () => {
      render(<Home />);
      const joinButtons = screen.getAllByRole("button", {
        name: /request to join/i,
      });
      expect(joinButtons).toHaveLength(2);
    });
  });
});
