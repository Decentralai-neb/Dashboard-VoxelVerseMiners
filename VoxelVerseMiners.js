import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import ABI from './ABI/skaleMinerSoloABI.json';
import prospectABI from './ABI/prospectABI.json';
import claimABI from './ABI/claimABI.json';
import usdcABI from './ABI/usdcABI.json';
import skaleABI from './ABI/skaleABI.json';
import config from './config';

function App() {
  const [web3, setWeb3] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [skaleStats, setSkaleStats] = useState({
    minersHashing: 0,
    totalHashrate: 0,
    totalPowerConsumption: 0,
    totalRewardsPaid: 0
  });
  const [userMinerStats, setUserMinerStats] = useState(null);
  const [tokenBalances, setTokenBalances] = useState('0');
  // Function to connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0]; // Get the first account as the user's address
        setUserAddress(userAddress); // Store the user's address in state
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        setConnected(true);
        console.log('Connected wallet address:', userAddress); // Log the user's address
        // Fetch user's miner token IDs
        const userMinerTokenIds = await fetchUserMinerTokenIds(userAddress);
        console.log("User's miner token IDs:", userMinerTokenIds);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error('Metamask not detected');
    }
  };

 // Function to fetch user's miner token IDs
const fetchUserMinerTokenIds = async (userAddress) => {
    try {
       // Initialize web3 instance
       const web3 = new Web3(window.ethereum);
   
       // Create contract instance
       const contract = new web3.eth.Contract(ABI, config.contractAddress);
   
       // Call the checkIfUserHasMiner function from the smart contract
       let tokenIds = await contract.methods.checkIfUserHasMiner(userAddress).call();

       // Convert BigInts to strings
        tokenIds = tokenIds.map(id => id.toString());
   
       return tokenIds;
    } catch (error) {
       console.error('Error fetching user miner token IDs:', error);
       return [];
    }
   };


    // Function to fetch skale stats and user miner stats
    const fetchSkaleStats = async () => {
        if (!web3) return;
    
        try {
            const contract = new web3.eth.Contract(ABI, config.contractAddress);
            const skaleStatsRaw = await contract.methods.skale().call();
    
            // Convert skale stats from wei to ether
            const skaleStatsConverted = {
                minersHashing: parseInt(skaleStatsRaw.minersHashing),
                totalHashrate: parseInt(skaleStatsRaw.totalHashrate),
                totalPowerConsumption: parseInt(skaleStatsRaw.totalPowerConsumption),
                totalRewardsPaid: web3.utils.fromWei(skaleStatsRaw.totalRewardsPaid, 'ether')
            };
    
            // Update state with skale stats
            setSkaleStats(skaleStatsConverted);
    
            // Fetch user's miner token IDs
            const userMinerTokenIds = await fetchUserMinerTokenIds(userAddress);
    
            // Fetch stats for each miner
            const userMinerStats = [];
            for (let tokenId of userMinerTokenIds) {
                const minerStats = await contract.methods.miners(tokenId).call();
                // Ensure all BigInts are converted to strings
                const convertedMinerStats = {
                    token: minerStats.token,
                    tokenId: minerStats.tokenId.toString(),
                    name: minerStats.name,
                    hashrate: minerStats.hashrate.toString(),
                    hashMeasured: minerStats.hashMeasured,
                    powerConsumption: minerStats.powerConsumption.toString(),
                    rewardPerBlock: minerStats.rewardPerBlock.toString(),
                    lastUpdateBlock: minerStats.lastUpdateBlock.toString(),
                    imageURI: minerStats.imageURI,
                };
    
                userMinerStats.push(convertedMinerStats);
            }
    
            // Update state with user miner stats
            setUserMinerStats(userMinerStats);
    
            // Log fetched data with BigInts converted to strings
            console.log('Fetched skale stats:', skaleStatsConverted);
    
            // Log user miner stats in the specified format
            userMinerStats.forEach(stats => {
                console.log('User miner stats:');
                for (const [key, value] of Object.entries(stats)) {
                    console.log(`${key} (${typeof value}) : ${value}`);
                }
            });
        } catch (error) {
            console.error('Error fetching skale stats:', error);
        }
    };

    useEffect(() => {
        // Fetch skale stats initially
        fetchSkaleStats();
    
        // Fetch skale stats every 3 minutes
        const intervalId = setInterval(fetchSkaleStats, 60000);
    
        // Cleanup interval
        return () => clearInterval(intervalId);
      }, [web3]);



   // Generic function to fetch user's ERC20 token balance
    const fetchTokenBalance = async (userAddress, tokenABI, tokenAddress) => {
        try {
            // Create contract instance
            const contract = new web3.eth.Contract(tokenABI, tokenAddress);

            // Call the balanceOf function from the ERC20 token contract
            const balance = await contract.methods.balanceOf(userAddress).call();

            // Convert the balance from wei to ether (if necessary)
            const balanceInEther = web3.utils.fromWei(balance, 'ether');

            return balanceInEther;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return '0';
        }
    };

    useEffect(() => {
        const fetchAndSetBalances = async () => {
            // Define the tokens you want to fetch balances for
            const tokens = [
                { name: 'Prospect', abi: prospectABI, address: config.prospectAddress },
                { name: 'Claim', abi: claimABI, address: config.claimAddress },
                { name: 'USDC', abi: usdcABI, address: config.usdctAddress },
                { name: 'Skale', abi: skaleABI, address: config.skaleAddress },
            ];
    
            // Initialize an object to store the balances
            const balances = {};
    
            // Fetch and set the balance for each token
            for (const token of tokens) {
                const balance = await fetchTokenBalance(userAddress, token.abi, token.address);
                balances[token.name] = balance;
            }
    
            // Update the state with the fetched balances
            setTokenBalances(balances);
        };
    
        fetchAndSetBalances();
    }, [userAddress]);
    


  



    // Render the fetched data in your component as needed


  return (
    <div>
      {!connected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>Connected</div>
      )}
      <div className="u-container-style u-expanded-width-xl u-group u-shape-rectangle u-group-6">
        <div className="u-container-layout u-container-layout-8">
          <h4 className="u-align-center u-custom-font u-text u-text-default u-text-5">
            skale distributed: {skaleStats.totalRewardsPaid} SKALE
            <br />
            current miners: {skaleStats.minersHashing} Miners
            <br />
            hashrate (voxelhash): {skaleStats.totalHashrate} Total Hashrate
            <br />
            power (watts): {skaleStats.totalPowerConsumption} Watts
          </h4>
        </div>
      </div>

      <div>
            <h2>Token Balances</h2>
            <ul>
            {Object.entries(tokenBalances).map(([tokenName, balance]) => (
                <li key={tokenName}>
                {tokenName}: {balance} ETH
                </li>
            ))}
            </ul>
        </div>

       {/* Render user miner stats here */}
        {userMinerStats && userMinerStats.map((stats, index) => (
        <div key={index}>
            <h3>Miner Stats for TokenId {stats.tokenId}</h3>
            <p>Token: {stats.token}</p>
            <p>Name: {stats.name}</p>
            <p>Hashrate: {stats.hashrate} {stats.hashMeasured}</p>
            <p>Power Consumption: {stats.powerConsumption}</p>
            <p>Reward Per Block: {stats.rewardPerBlock}</p>
            <p>Last Update Block: {stats.lastUpdateBlock}</p>
            <img src={stats.imageURI} alt="Miner Image" />
        </div>
        ))}



    </div>
  );
}

export default App;
