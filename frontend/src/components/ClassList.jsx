import ClassRow from "./ClassRow";

export default function ClassList({ classes, onSelect, onPlay, audio, emptyMessage }) {
  if (classes.length === 0) {
    return (
      <div className="text-center text-text-secondary text-[14px] py-16">
        {emptyMessage || "No classes found."}
      </div>
    );
  }

  return (
    <div>
      {classes.map((item) => (
        <ClassRow
          key={item.id}
          item={item}
          onSelect={onSelect}
          onPlay={onPlay}
          isPlaying={Boolean(audio?.playing && audio.classId === item.id)}
        />
      ))}
    </div>
  );
}
