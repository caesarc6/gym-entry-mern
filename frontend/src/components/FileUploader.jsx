// import { useRef } from "react";
// import "../index.css";

// export const FileUploader = ({ handleFile, accept = "image/*" }) => {
//   const hiddenFileInput = useRef(null);

//   const handleClick = (e) => {
//     e.preventDefault(); // Prevent form submission
//     hiddenFileInput.current.click();
//   };

//   const handleChange = (event) => {
//     const fileUploaded = event.target.files[0];
//     if (fileUploaded) {
//       handleFile(fileUploaded);
//     }
//   };

//   return (
//     <>
//       <button className="button-upload" onClick={handleClick} type="button">
//         Upload Image
//       </button>
//       <input
//         type="file"
//         onChange={handleChange}
//         ref={hiddenFileInput}
//         accept={accept}
//         style={{ display: "none" }}
//       />
//     </>
//   );
// };

// FileUploader.js
import { useRef } from "react";
import "../index.css";

export const FileUploader = ({ handleFile }) => {
  const hiddenFileInput = useRef(null);

  const handleClick = (e) => {
    e.preventDefault(); // Prevent form submission
    hiddenFileInput.current.click();
  };

  const handleChange = (event) => {
    const fileUploaded = event.target.files[0];
    handleFile(fileUploaded);
  };

  return (
    <>
      <button
        className="button-upload"
        onClick={handleClick}
        type="button" // Explicitly set type to "button"
      >
        Add Image
      </button>
      <input
        type="file"
        onChange={handleChange}
        ref={hiddenFileInput}
        style={{ display: "none" }}
      />
    </>
  );
};
