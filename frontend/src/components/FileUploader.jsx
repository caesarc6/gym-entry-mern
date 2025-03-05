// // FileUploader.js
// import { useRef } from "react";
// import "../index.css";

// export const FileUploader = ({ handleFile }) => {
//   const hiddenFileInput = useRef(null);

//   const handleClick = () => {
//     hiddenFileInput.current.click();
//   };

//   const handleChange = (event) => {
//     const fileUploaded = event.target.files[0];
//     handleFile(fileUploaded);
//   };

//   return (
//     <>
//       <button className="button-upload" onClick={handleClick}>
//         Upload a file
//       </button>
//       <input
//         type="file"
//         onChange={handleChange}
//         ref={hiddenFileInput}
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
        Profile Picture
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
