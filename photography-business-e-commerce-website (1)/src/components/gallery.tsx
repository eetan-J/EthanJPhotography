"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

export default function Gallery({ images, name, location }: { images: string[]; name: string; location: string }) {
  const [active, setActive] = useState(0);
  const src = images[active] || images[0];
  return <div className="pp-image">
    <img src={src} alt={name}/>
    {location && <span className="pp-image-tag"><MapPin size={14}/> {location}</span>}
    {images.length > 1 && <div className="pp-thumbs">{images.map((img, i) => <button key={img + i} className={i === active ? "on" : ""} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}><img src={img} alt=""/></button>)}</div>}
  </div>;
}