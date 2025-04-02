import React, { useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import "./App.css"; // CSS 파일 import

function App() {
  const [files, setFiles] = useState([]);
  const [fileInfos, setFileInfos] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [orientation, setOrientation] = useState("Vertical");
  const [format, setFormat] = useState("PNG");
  const [lastGap, setLastGap] = useState(30);
  const [resizeScale, setResizeScale] = useState(100);
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [centerAlign, setCenterAlign] = useState(true);
  const [autoResize, setAutoResize] = useState(true);
  const [progress, setProgress] = useState(0);

  const getImageInfo = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + "MB",
          width: img.width,
          height: img.height,
        });
      };
      img.src = URL.createObjectURL(file);
    });

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    droppedFiles.sort((a, b) => a.name.localeCompare(b.name));
    setFiles(droppedFiles);
    setGaps(droppedFiles.length > 1 ? Array(droppedFiles.length - 1).fill(30) : []);

    const infos = await Promise.all(droppedFiles.map((file) => getImageInfo(file)));
    setFileInfos(infos);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("📂 폴더를 먼저 드래그하세요!");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    formData.append("orientation", orientation);
    formData.append("format", format);
    formData.append("gaps", gaps);
    formData.append("lastGap", lastGap);
    formData.append("resizeScale", resizeScale);
    formData.append("resizeWidth", resizeWidth);
    formData.append("resizeHeight", resizeHeight);
    formData.append("centerAlign", centerAlign);
    formData.append("autoResize", autoResize);

    try {
      const res = await axios.post("http://localhost:8080/api/v1/image/merge", formData, {
        responseType: "blob",
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      const contentDisposition = res.headers["content-disposition"];
      let filename = "merged_result";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=\"(.+)\"/);
        if (match) filename = match[1];
      }

      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      saveAs(blob, filename);
      setProgress(0);
    } catch (err) {
      alert("❗ 에러 발생: " + err);
      setProgress(0);
    }
  };

  return (
    <div className="container">
      <h2 className="title">이미지 병합기</h2>

      {/* 설정 영역 */}
      <div className="panel">
        <Setting label="방향">
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            className="input"
          >
            <option value="Vertical">Vertical</option>
            <option value="Horizontal">Horizontal</option>
          </select>
        </Setting>

        <Setting label="포맷">
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="input">
            <option value="PNG">PNG</option>
            <option value="JPG">JPG</option>
          </select>
        </Setting>

        <Setting label="마지막 여백(px)">
          <input
            type="number"
            value={lastGap}
            onChange={(e) => setLastGap(parseInt(e.target.value) || 0)}
            className="input"
          />
        </Setting>

        <Setting label="리사이즈 비율(%)">
          <input
            type="number"
            value={resizeScale}
            onChange={(e) => setResizeScale(parseInt(e.target.value) || 100)}
            className="input"
          />
        </Setting>

        <Setting label="가로(px)">
          <input
            type="number"
            value={resizeWidth}
            onChange={(e) => setResizeWidth(e.target.value)}
            className="input"
          />
        </Setting>

        <Setting label="세로(px)">
          <input
            type="number"
            value={resizeHeight}
            onChange={(e) => setResizeHeight(e.target.value)}
            className="input"
          />
        </Setting>

        <Setting>
          <label>
            <input
              type="checkbox"
              checked={centerAlign}
              onChange={(e) => setCenterAlign(e.target.checked)}
            />{" "}
            가운데 정렬
          </label>
        </Setting>

        <Setting>
          <label>
            <input
              type="checkbox"
              checked={autoResize}
              onChange={(e) => setAutoResize(e.target.checked)}
            />{" "}
            JPG 자동 리사이즈
          </label>
        </Setting>
      </div>

      {/* 드래그 영역 */}
      <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="dropArea">
        📂 폴더를 여기에 드래그 앤 드롭하세요
      </div>

      {/* 파일 리스트 */}
      {fileInfos.length > 0 && (
        <div className="fileList">
          <h4 className="fileListTitle">파일 목록 ({fileInfos.length}개)</h4>
          <div className="fileItems">
            {fileInfos.map((info, index) => (
              <div key={index} className="fileItem">
                <div className="fileName">{info.name}</div>
                <div className="fileDetails">
                  {info.size} / {info.width} × {info.height}
                </div>
              </div>
            ))}
          </div>

          {/* 개별 간격 */}
          <div className="gaps">
            <label className="gapsLabel">개별 간격(px):</label>
            <div className="gapsInputs">
              {gaps.map((gap, i) => (
                <input
                  key={i}
                  type="number"
                  value={gap}
                  onChange={(e) => {
                    const newGaps = [...gaps];
                    newGaps[i] = parseInt(e.target.value) || 0;
                    setGaps(newGaps);
                  }}
                  className="input smallInput"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 저장 버튼 */}
      <button onClick={handleSubmit} className="button">
        💾 병합 저장
      </button>

      {/* 진행률 */}
      {progress > 0 && (
        <div className="progressContainer">
          진행률: {progress}%
          <div className="progressBar">
            <div className="progress" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

const Setting = ({ label, children }) => (
  <div className="setting">
    {label && <label className="settingLabel">{label}:</label>}
    {children}
  </div>
);

export default App;
