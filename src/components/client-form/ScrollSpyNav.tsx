import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  completed?: boolean;
}

interface ScrollSpyNavProps {
  sections: Section[];
}

export const ScrollSpyNav = ({ sections }: ScrollSpyNavProps) => {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(`section-${section.id}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="hidden lg:block sticky top-32 w-64 h-fit">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-3 px-3">
          SECTIONS
        </p>
        {sections.map((section, index) => {
          const isActive = activeSection === `section-${section.id}`;
          
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-all",
                "hover:bg-muted/50",
                isActive && "bg-muted text-foreground font-medium border-l-2 border-primary"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">
                  {index + 1}.
                </span>
                <span className="truncate flex-1">{section.title}</span>
                {section.completed && (
                  <Check className="h-3 w-3 text-primary shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
