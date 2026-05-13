import { AboutContent } from "@/components/AboutContent";
import { getAbout } from "@/lib/storage";

export default async function AboutPage() {
  const about = await getAbout();
  return <AboutContent about={about} />;
}
