import React from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {useIAP, validateReceiptIos} from 'react-native-iap';

function useSubscription() {
  // in-app hooks
  const {currentPurchase, currentPurchaseError} = useIAP();

  // useState
  const [recipt, setRecipt] = React.useState('');
  const [isExpired, setExpire] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // ... listen to currentPurchaseError, to check if any error happened
    console.log('currentPurchaseError');
    if (currentPurchaseError) {
      setExpire(true);
      setLoading(false);
    }
  }, [currentPurchaseError]);

  React.useEffect(() => {
    // ... listen to currentPurchase, to check if the purchase went through
    console.log('currentPurchase---', currentPurchase);
    if (currentPurchase) {
      AsyncStorage.setItem('receipt', currentPurchase?.transactionReceipt);
      setRecipt(currentPurchase?.transactionReceipt);
    }
  }, [currentPurchase]);

  React.useEffect(() => {
    _getRecipt();
  }, [recipt]);

  const _getRecipt = async () => {
    const receipt = await AsyncStorage.getItem('receipt');
    if (receipt) {
      _getReceiptData(receipt);
    } else {
      setExpire(true);
      setLoading(false);
    }
  };

  // get recipt data for iOS
  const _getReceiptData = async (receipt: any) => {
    const receiptBody: any = {
      'receipt-data': receipt,
      password: '94827f808b414ce290bbfd2c25709134',
    };

    await validateReceiptIos({receiptBody: receiptBody, isTest: true})
      .then(result => {
        console.debug('_getReceiptData -----', result);
        const strSubExpDate = result?.latest_receipt_info[0]?.expires_date_ms;
        const subExpDate = parseInt(strSubExpDate);

        AsyncStorage.setItem('subexpdate', strSubExpDate);

        const subExpDateObj = new Date(subExpDate);
        console.log('subExpDateObj ----', subExpDateObj);

        const curtDate = Date.now();
        const curtDateObj = new Date(curtDate);
        console.log('curtDateObj ----', curtDateObj);

        const isExpired = curtDateObj.getTime() > subExpDateObj.getTime();
        console.log('isExpired ----', isExpired);

        setExpire(isExpired);
        setLoading(false);
      })
      .catch(err => {
        setExpire(true);
        setLoading(false);
      });
  };

  return [isExpired, loading];
}

export default useSubscription;
