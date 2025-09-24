// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

library SafeSendFixed {
    function safeSend(address payable _to, uint256 _value, address _wethLike) internal {
        // First, try native send
        (bool sent, ) = _to.call{value: _value, gas: 2300}("");
        if (sent) return;

        // Deposit to WETH-like
        (bool depOk, ) = _wethLike.call{value: _value}(abi.encodeWithSelector(bytes4(keccak256("deposit()"))));
        require(depOk, "WETH deposit failed");

        // Transfer and require success or true boolean
        (bool success, bytes memory data) = _wethLike.call(
            abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), _to, _value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "WETH transfer failed");
    }
}
