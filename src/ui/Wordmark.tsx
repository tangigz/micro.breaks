/** micro.breaks, 20 / 700 with the dot in pos (17 px in the prompt header). */
export function Wordmark({ size = 20 }: { size?: 17 | 20 }) {
  return (
    <div
      className={`${size === 17 ? 'text-[17px]' : 'text-[20px]'} leading-none font-bold tracking-[-0.01em]`}
    >
      micro<span className="text-pos">.</span>breaks
    </div>
  );
}
