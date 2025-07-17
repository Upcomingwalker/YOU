    function updateTime() {
      const now = new Date();
      const date = now.toLocaleDateString();
      const time = now.toLocaleTimeString();
      document.getElementById('clock').textContent = `${date} ${time}`;
    }

    updateTime();
    setInterval(updateTime, 1000);