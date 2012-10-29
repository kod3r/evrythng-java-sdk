/*
 * (c) Copyright 2012 EVRYTHNG Ltd London / Zurich
 * www.evrythng.com
 * 
 */
package com.evrythng.java.wrapper.exception;

/**
 * Root definition for handling any exception thrown by the wrapper.
 * 
 * @author Thomas Pham (tpham)
 * @author Pedro De Almeida (almeidap)
 **/
public abstract class EvrythngException extends Exception {

	private static final long serialVersionUID = 1L;

	public EvrythngException(String message) {
		super(message);
	}

	public EvrythngException(String message, Throwable cause) {
		super(message, cause);
	}
}
