import React, { useState } from 'react';

function CommentForm({ reportId, onComment }) {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) return;
    await onComment(reportId, text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Escreva um comentário"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button type="submit">Comentar</button>
    </form>
  );
}

export default CommentForm;