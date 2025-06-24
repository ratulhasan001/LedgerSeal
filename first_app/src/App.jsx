import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import axios from "axios";
import "./App.css";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "YOUR_DEPLOYED_CONTRACT_ADDRESS";

const FILE_STORAGE_ABI = {"abi":[{"type":"constructor","inputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"DEFAULT_ADMIN_ROLE","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"UPLOADER_ROLE","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"getRoleAdmin","inputs":[{"name":"role","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"grantRole","inputs":[{"name":"role","type":"bytes32","internalType":"bytes32"},{"name":"account","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"grantUploaderRole","inputs":[{"name":"_account","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"hasRole","inputs":[{"name":"role","type":"bytes32","internalType":"bytes32"},{"name":"account","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"isHashStored","inputs":[{"name":"","type":"string","internalType":"string"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"renounceRole","inputs":[{"name":"role","type":"bytes32","internalType":"bytes32"},{"name":"callerConfirmation","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"revokeRole","inputs":[{"name":"role","type":"bytes32","internalType":"bytes32"},{"name":"account","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"revokeUploaderRole","inputs":[{"name":"_account","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"storeHash","inputs":[{"name":"_fileHash","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"supportsInterface","inputs":[{"name":"interfaceId","type":"bytes4","internalType":"bytes4"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"event","name":"HashStored","inputs":[{"name":"fileHash","type":"string","indexed":false,"internalType":"string"},{"name":"uploader","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"RoleAdminChanged","inputs":[{"name":"role","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"previousAdminRole","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"newAdminRole","type":"bytes32","indexed":true,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"RoleGranted","inputs":[{"name":"role","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"account","type":"address","indexed":true,"internalType":"address"},{"name":"sender","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"RoleRevoked","inputs":[{"name":"role","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"account","type":"address","indexed":true,"internalType":"address"},{"name":"sender","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"error","name":"AccessControlBadConfirmation","inputs":[]},{"type":"error","name":"AccessControlUnauthorizedAccount","inputs":[{"name":"account","type":"address","internalType":"address"},{"name":"neededRole","type":"bytes32","internalType":"bytes32"}]}]};
const CONTRACT_ABI = FILE_STORAGE_ABI.abi;

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [uploading, setUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");

  const [checkFile, setCheckFile] = useState(null);
  const [checkFileHash, setCheckFileHash] = useState("");
  const [hashCheckStatus, setHashCheckStatus] = useState("Select a file to check its hash.");
  const [checkLoading, setCheckLoading] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const [statusMessage, setStatusMessage] = useState("Please connect your wallet.");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploader, setIsUploader] = useState(false);
  const [grantAddress, setGrantAddress] = useState("");
  const [revokeAddress, setRevokeAddress] = useState("");
  
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const initEthersAndRoles = async () => {
      try {
        let currentProvider;
        let currentSigner;
        let connectedAccount;

        if (window.ethereum) {
          currentProvider = new ethers.BrowserProvider(window.ethereum);
          
          window.ethereum.on("accountsChanged", () => window.location.reload());
          window.ethereum.on("chainChanged", () => window.location.reload());

          const accounts = await currentProvider.send("eth_requestAccounts", []);
          connectedAccount = accounts[0];
          currentSigner = await currentProvider.getSigner(connectedAccount);
          
          setCurrentAccount(connectedAccount);
          setSigner(currentSigner);
          setStatusMessage(`Connected: ${connectedAccount.substring(0, 6)}...${connectedAccount.slice(-4)}`);
        } else {
          setStatusMessage("MetaMask not detected. Using a read-only provider.");
          currentProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        }
        
        setProvider(currentProvider);

        if (currentProvider) {
          const fileStorageContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            currentSigner || currentProvider
          );
          setContract(fileStorageContract);

          if (connectedAccount) {
            const ADMIN_ROLE = await fileStorageContract.DEFAULT_ADMIN_ROLE();
            const UPLOADER_ROLE = await fileStorageContract.UPLOADER_ROLE();

            const hasAdminRole = await fileStorageContract.hasRole(ADMIN_ROLE, connectedAccount);
            const hasUploaderRole = await fileStorageContract.hasRole(UPLOADER_ROLE, connectedAccount);
            
            setIsAdmin(hasAdminRole);
            setIsUploader(hasUploaderRole);

            let roleStatus = [];
            if (hasAdminRole) roleStatus.push("Admin");
            if (hasUploaderRole) roleStatus.push("Uploader");
            
            const roleString = roleStatus.length > 0 ? `Roles: ${roleStatus.join(', ')}` : "No roles assigned.";
             setStatusMessage(`Connected: ${connectedAccount.substring(0, 6)}...${connectedAccount.slice(-4)} | ${roleString}`);
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        setStatusMessage(`Error connecting: ${error.message}. Ensure MetaMask is connected correctly.`);
      }
    };

    initEthersAndRoles();
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(newDarkMode));
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds) => {
    if (seconds === Infinity || isNaN(seconds)) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getFileHash = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(fileContent);
        const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
        resolve(hash);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setIpfsHash("");
      setTransactionHash("");
      setStatusMessage("Generating file hash...");
      try {
        const hash = await getFileHash(file);
        setFileHash(hash);
        setStatusMessage(`File hash generated: ${hash}. Ready for upload.`);
      } catch (error) {
        setStatusMessage("Error reading file.");
        console.error(error);
      }
    }
  };

  const handleUpload = async () => {
    if (!isUploader) {
      setStatusMessage("Access Denied: You do not have the UPLOADER_ROLE.");
      return;
    }
    if (!selectedFile || !fileHash) {
      setStatusMessage("Please select a file first.");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setEstimatedTime(0);
    setUploadedBytes(0);
    setTotalBytes(selectedFile.size);
    setUploadPhase("Preparing upload...");
    setStatusMessage("Starting upload process...");

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    try {
      if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
        throw new Error("Pinata API keys are not set in .env file.");
      }
      
      setUploadPhase("Uploading to IPFS...");
      setStatusMessage("Uploading file to Pinata IPFS...");
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_API_KEY,
          },
          onUploadProgress: (progressEvent) => {
            const currentTime = Date.now();
            const timeElapsed = (currentTime - lastTime) / 1000; // seconds
            const bytesUploaded = progressEvent.loaded;
            const totalSize = progressEvent.total;
            
            if (timeElapsed > 0) {
              const bytesThisInterval = bytesUploaded - lastLoaded;
              const currentSpeed = bytesThisInterval / timeElapsed;
              setUploadSpeed(currentSpeed);
              
              const remainingBytes = totalSize - bytesUploaded;
              const estimatedSeconds = remainingBytes / currentSpeed;
              setEstimatedTime(estimatedSeconds);
              
              lastLoaded = bytesUploaded;
              lastTime = currentTime;
            }
            
            const progress = Math.round((bytesUploaded / totalSize) * 100);
            setUploadProgress(progress);
            setUploadedBytes(bytesUploaded);
          }
        }
      );
      
      const cid = res.data.IpfsHash;
      setIpfsHash(cid);
      setUploadPhase("IPFS upload complete!");
      setUploadProgress(100);
      setStatusMessage(`File uploaded to IPFS! CID: ${cid}. Now storing hash...`);

      setUploadPhase("Storing hash on blockchain...");
      if (!contract || !signer) throw new Error("Contract or signer not initialized.");
      const tx = await contract.storeHash(fileHash);
      setTransactionHash(tx.hash);
      setUploadPhase("Waiting for blockchain confirmation...");
      setStatusMessage(`Transaction sent! Waiting for confirmation... Tx: ${tx.hash}`);
      await tx.wait();
      setUploadPhase("Complete!");
      setStatusMessage(`Hash stored on blockchain successfully!`);

    } catch (error) {
      console.error("Upload process failed:", error);
      setUploadPhase("Upload failed");
      setStatusMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadSpeed(0);
        setEstimatedTime(0);
        setUploadedBytes(0);
        setTotalBytes(0);
        setUploadPhase("");
      }, 3000);
    }
  };

  const handleGrantRole = async () => {
    if (!isAdmin) {
      setStatusMessage("Only admins can grant roles.");
      return;
    }
    if (!ethers.isAddress(grantAddress)) {
      setStatusMessage("Invalid Ethereum address provided.");
      return;
    }
    setStatusMessage(`Granting UPLOADER_ROLE to ${grantAddress}...`);
    try {
      const tx = await contract.grantUploaderRole(grantAddress);
      await tx.wait();
      setStatusMessage(`Successfully granted UPLOADER_ROLE to ${grantAddress.substring(0,6)}...`);
      setGrantAddress("");
    } catch (error) {
      console.error("Error granting role:", error);
      setStatusMessage(`Error: ${error.reason || error.message}`);
    }
  };

  const handleRevokeRole = async () => {
    if (!isAdmin) {
      setStatusMessage("Only admins can revoke roles.");
      return;
    }
    if (!ethers.isAddress(revokeAddress)) {
      setStatusMessage("Invalid Ethereum address provided.");
      return;
    }
     setStatusMessage(`Revoking UPLOADER_ROLE from ${revokeAddress}...`);
    try {
      const tx = await contract.revokeUploaderRole(revokeAddress);
      await tx.wait();
      setStatusMessage(`Successfully revoked UPLOADER_ROLE from ${revokeAddress.substring(0,6)}...`);
      setRevokeAddress("");
    } catch (error) {
      console.error("Error revoking role:", error);
      setStatusMessage(`Error: ${error.reason || error.message}`);
    }
  };
  
  const handleCheckFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setCheckFile(file);
      setHashCheckStatus(`Hashing ${file.name}...`);
      try {
        const hash = await getFileHash(file);
        setCheckFileHash(hash);
        setHashCheckStatus(`Ready to check hash for ${file.name}.`);
      } catch (error) {
        setHashCheckStatus("Error reading file for hash check.");
        console.error(error);
      }
    }
  };

  const checkHashOnBlockchain = async () => {
    if (!checkFileHash) {
      setHashCheckStatus("Please select a file first.");
      return;
    }
    if (!contract) {
      setHashCheckStatus("Blockchain connection not established.");
      return;
    }

    setCheckLoading(true);
    setHashCheckStatus(`Checking for hash ${checkFileHash.substring(0, 8)}...`);
    try {
      const hashExists = await contract.isHashStored(checkFileHash);
      setHashCheckStatus(
        hashExists
          ? `✅ Hash Found on Blockchain!`
          : `❌ Hash NOT Found on Blockchain.`
      );
    } catch (error) {
      console.error("Error checking hash on blockchain:", error);
      setHashCheckStatus(`Error checking hash: ${error.message}.`);
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <div className="App">
      <button className="theme-toggle" onClick={toggleDarkMode} title="Toggle Theme">
        {isDarkMode ? "☀️" : "🌙"}
      </button>

      <header className="App-header">
        <h1>🔐 File Verifier DApp</h1>
        <p>Secure file verification with blockchain technology and AccessControl</p>
        
        {currentAccount && (
          <div className="status-display">
            <p>
              <strong>Connected Account:</strong> <code>{currentAccount.substring(0, 6)}...{currentAccount.slice(-4)}</code>
            </p>
            <div className={`role-badge ${isAdmin ? 'admin' : ''} ${isUploader ? 'uploader' : ''}`}>
              {isAdmin && <span>👑 Admin</span>}
              {isUploader && <span>📤 Uploader</span>}
              {!isAdmin && !isUploader && <span>No Roles</span>}
            </div>
          </div>
        )}
      </header>

      <div className="main-container">
        <div className="card upload-section">
          <h2>📤 Upload & Store Hash</h2>
          <div className="form-group">
            <label htmlFor="upload-file">Select File to Upload</label>
            <input id="upload-file" type="file" onChange={handleFileChange} disabled={uploading || !isUploader} />
          </div>
          <button onClick={handleUpload} disabled={!selectedFile || !fileHash || uploading || !isUploader} className="btn btn-primary">
            {uploading ? "Processing..." : "⛓️ Upload & Store Hash"}
          </button>

          {uploading && (
            <div className="upload-progress-container">
              <div className="upload-progress-header">
                <span className="upload-phase">{uploadPhase}</span>
                <span className="upload-percentage">{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="upload-stats">
                <div className="upload-stat">
                  <span className="stat-label">Speed:</span>
                  <span className="stat-value">{formatSpeed(uploadSpeed)}</span>
                </div>
                <div className="upload-stat">
                  <span className="stat-label">Progress:</span>
                  <span className="stat-value">{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}</span>
                </div>
                <div className="upload-stat">
                  <span className="stat-label">ETA:</span>
                  <span className="stat-value">{formatTime(estimatedTime)}</span>
                </div>
              </div>
            </div>
          )}

           <div className={`status-box ${!isUploader && currentAccount ? "danger" : "info"}`}>
            <p>{statusMessage}</p>
          </div>
        </div>

        <div className="card hash-check-section">
          <h2>🔍 Verify Hash</h2>
          <div className="form-group">
            <label htmlFor="check-file">Select File to Verify</label>
            <input id="check-file" type="file" onChange={handleCheckFileChange} disabled={checkLoading} />
          </div>
          <button onClick={checkHashOnBlockchain} disabled={!checkFileHash || checkLoading || !contract} className="btn btn-secondary">
            {checkLoading ? "Verifying..." : "🔎 Check on Blockchain"}
          </button>
          <div className={`status-box ${hashCheckStatus.includes("Found") ? "success" : hashCheckStatus.includes("NOT Found") ? "warning" : "info"}`}>
            <p>{hashCheckStatus}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="card admin-section">
            <h2>⚙️ Admin Panel</h2>
            <div className="admin-action">
              <h3>Grant Uploader Role</h3>
              <div className="form-group">
                <input type="text" placeholder="0x..." value={grantAddress} onChange={(e) => setGrantAddress(e.target.value)} />
                <button onClick={handleGrantRole} disabled={!ethers.isAddress(grantAddress)} className="btn btn-primary">
                  Grant Role
                </button>
              </div>
            </div>
            <div className="admin-action">
              <h3>Revoke Uploader Role</h3>
              <div className="form-group">
                <input type="text" placeholder="0x..." value={revokeAddress} onChange={(e) => setRevokeAddress(e.target.value)} />
                <button onClick={handleRevokeRole} disabled={!ethers.isAddress(revokeAddress)} className="btn btn-danger">
                  Revoke Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;