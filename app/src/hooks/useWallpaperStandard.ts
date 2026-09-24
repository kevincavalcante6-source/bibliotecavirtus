import { useEffect, useState } from "react";
import { listWallpaperSizes } from "@/services/content.service";
import { standardOf } from "@/lib/aspect";
import type { AspectStandard } from "@/lib/aspect";

/** O formato mais comum entre os wallpapers já publicados. */
export function useWallpaperStandard(): AspectStandard | null {
  const [standard, setStandard] = useState<AspectStandard | null>(null);

  useEffect(() => {
    let active = true;
    listWallpaperSizes()
      .then((sizes) => {
        if (active) setStandard(standardOf(sizes));
      })
      .catch(() => {
        /* sem padrão, sem aviso — o envio segue normal */
      });
    return () => {
      active = false;
    };
  }, []);

  return standard;
}
